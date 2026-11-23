import type {InvocationObservations} from "@workspace-skills/system-testing/observed-invocation";
import {assessSemanticOutcome,type SemanticOutcomeContract} from "@workspace-skills/system-testing/semantic-outcome-contract";
import { isDeepStrictEqual } from "node:util";
import { sha256HexSyncText } from "@vibestudio/content-addressing";
import type { Task } from "@workspace/mission-control";
import { missionControlRpcMethods } from "@workspace/mission-control/rpc-contract";
import { contextId as actualContextId, createDurableObjectServiceClient, fs } from "@workspace/runtime";
import { bindMissionPlanning } from "@workspace-skills/mission-planning-runtime";
import type { BoardChange, BoardSnapshot, BoardStatus, HandoffReceipt, MissionFinding, MissionGoalReport } from "./program/types.js";

type RequestedChange =
  | { kind: "ready"; key: string }
  | { kind: "relocate"; key: string; destination: string }
  | { kind: "prerequisites"; key: string; requires: readonly string[] };
type ExpectedStep = RequestedChange
  | { kind: "observed"; key: string }
  | { kind: "held"; key?: string; blockers: readonly string[] };
type Race = { key: string; description?: string; requires?: readonly string[] };
export type OpenPersonalWorld = {
  id: string;
  goal: string;
  projects: readonly { key: string; name: string; archived?: boolean }[];
  cards: readonly { key: string; title: string; project: string; status: BoardStatus; requires: readonly string[] }[];
  authority: { writes: readonly { key: string; kinds: readonly BoardChange["kind"][] }[]; handoff: boolean };
  concurrent?: Race & { attempt: RequestedChange };
  expected: { steps: readonly ExpectedStep[]; handoff: readonly string[] };
};
type Transition = { before: BoardSnapshot; change: BoardChange; status: "applied" | "changed"; snapshot: BoardSnapshot };

function patch(change: BoardChange): Partial<Task> {
  if (change.kind === "ready") return { status: "ready" };
  if (change.kind === "relocate") return { projectId: change.projectId };
  return { dependencies: change.dependencies };
}

function shapeHandoff(snapshot: BoardSnapshot, cardIds: readonly string[]): string {
  const rows = cardIds.map((id) => {
    const card = snapshot.cards.find((row) => row.id === id);
    if (!card) throw new Error("Handoff cards must be present in the final board");
    const project = snapshot.projects.find((row) => row.id === card.projectId);
    if (!project || project.archived) throw new Error("Handoff cards must belong to a current project");
    const prerequisites = card.dependencies.map((key) => {
      const dependency = snapshot.cards.find((row) => row.id === key);
      if (!dependency) throw new Error("Discover the card's prerequisites before staging its handoff");
      return { id: key, title: dependency.title, status: dependency.status };
    });
    return { id, title: card.title, project: project.name, revision: card.revision, status: card.status, prerequisites };
  });
  return JSON.stringify({ schema: "vibestudio.mission-handoff/1", cards: rows }, null, 2) + "\n";
}

export async function prepareOpenPersonalGoal({ contextId, caseId }: { contextId: string; caseId: string }, world: OpenPersonalWorld) {
  if (contextId !== actualContextId || caseId !== world.id)
    throw new Error("Mission goals require their owned context and case");
  const objectKey = `natlang-mission-planning-${contextId}`;
  const store = createDurableObjectServiceClient("mission-planning-fixture.v1", missionControlRpcMethods, objectKey);
  const projects = new Map<string, string>();
  const cards = new Map<string, string>();
  const requireId = (names: Map<string, string>, name: string) => {
    const id = names.get(name);
    if (!id) throw new Error(`Unknown managed Mission Control key ${name}`);
    return id;
  };
  const projectId = (name: string) => requireId(projects, name);
  const cardId = (name: string) => requireId(cards, name);
  for (const row of world.projects) {
    const project = await store.call("createProject", { name: row.name, repos: [] });
    projects.set(row.key, project.id);
  }
  for (const row of world.cards) {
    const card = await store.call("createTask", {
      projectId: projectId(row.project), title: row.title, status: row.status,
      dependencies: row.requires.map(cardId), description: `Working notes for ${row.title}`,
      tags: ["owned-mission-board"],
      checklist: [{ id: "confirm", text: "Preserve the owner's confirmation step", done: false }],
    });
    cards.set(row.key, card.id);
  }
  for (const project of world.projects.filter((row) => row.archived))
    await store.call("updateProject", { id: projectId(project.key), expectedRevision: 1, changes: { archived: true } });
  const unrelated = await store.call("createProject", { name: "Private admin", repos: [] });
  const protectedCard = await store.call("createTask", { projectId: unrelated.id, title: "Protected notes" });
  const readCards = () => Promise.all([...cards.values()].map((id) => store.call("getTask", { id })));
  const initial = await readCards();
  let updateStarted = false;
  const binding = bindMissionPlanning({
    projects: async () => (await store.call("overview", { limit: 1 })).projects,
    cards: (id, options) => store.call("taskOptions", { projectId: id, ...options }),
    update(change) {
      updateStarted = true;
      return store.call("updateTask", change);
    },
  }, [...projects.values()]);
  const grants = new Map(world.authority.writes.map(({ key, kinds }) => [cardId(key), new Set(kinds)]));
  let current: BoardSnapshot | undefined;
  let baseline: BoardSnapshot | undefined;
  let concurrentEdit: { before: Task; after: Task } | undefined;
  let handoff: HandoffReceipt | null = null;
  let handoffText: string | null = null;
  let busy = false;
  const transitions: Transition[] = [];

  async function exclusive<T>(run: () => Promise<T>): Promise<T> {
    if (busy) throw new Error("Wait for the current mission goal operation to complete");
    busy = true;
    try {
      return await run();
    } finally {
      busy = false;
    }
  }

  const services = {
    missionGoalBoard: {
      observe: () => exclusive(async () => {
        if (baseline) throw new Error("Use the newest returned board observation");
        current = await binding.missionPlanningState.observe();
        baseline = structuredClone(current);
        return structuredClone(current);
      }),
    },
    missionGoalChange: {
      apply: (snapshotId: string, change: BoardChange) => exclusive(async () => {
        const before = current;
        if (!before?.complete || before.id !== snapshotId || handoff ||
            !grants.get(change.cardId)?.has(change.kind))
          throw new Error("Select an authorized card operation from the current board observation");
        if (world.concurrent && !concurrentEdit) {
          const { key, description, requires } = world.concurrent;
          const old = await store.call("getTask", { id: cardId(key) });
          const after = await store.call("updateTask", {
            id: old.id, expectedRevision: old.revision, changes: {
              ...(description !== undefined ? { description } : {}),
              ...(requires ? { dependencies: requires.map(cardId) } : {}),
            },
          });
          concurrentEdit = { before: old, after };
        }
        let status: Transition["status"] = "applied";
        updateStarted = false;
        try {
          current = await binding.missionPlanningChange.apply(snapshotId, change);
        } catch (error) {
          // A lost update receipt cannot distinguish a failed write from a committed one.
          if (updateStarted) throw error;
          const fresh = await binding.missionPlanningState.observe();
          if (isDeepStrictEqual(fresh.cards, before.cards) && isDeepStrictEqual(fresh.projects, before.projects)) throw error;
          current = fresh;
          status = "changed";
        }
        if (!current) throw new Error("Mission Control returned no board");
        transitions.push({ before, change: structuredClone(change), status, snapshot: current });
        return { status, snapshot: structuredClone(current) };
      }),
    },
    missionGoalHandoff: {
      stage: (snapshotId: string, requested: string[]) => exclusive(async () => {
        const before = current;
        if (!world.authority.handoff || !before?.complete || before.id !== snapshotId || handoff ||
            !Array.isArray(requested) || requested.length === 0 || new Set(requested).size !== requested.length)
          throw new Error("Stage one authorized handoff for distinct cards from the current board");
        const fresh = await binding.missionPlanningState.observe();
        if (!fresh.complete || !isDeepStrictEqual(fresh.cards, before.cards) || !isDeepStrictEqual(fresh.projects, before.projects))
          throw new Error("The board moved before staging its handoff");
        const text = shapeHandoff(before, requested);
        const directory = await fs.mkdtemp("mission-goal");
        const path = `${directory}/mission-handoff.json`;
        await fs.writeFile(path, text);
        const stored = await fs.readFile(path, "utf8");
        if (stored !== text) throw new Error("Mission handoff readback differs from the staged board");
        handoffText = text;
        handoff = { path, snapshotId, cardIds: [...requested], sha256: sha256HexSyncText(text) };
        return structuredClone(handoff);
      }),
    },
  };

  function findChange(step: RequestedChange, snapshot: BoardSnapshot): BoardChange {
    const id = cardId(step.key);
    const row = snapshot.cards.find((card) => card.id === id);
    if (!row) throw new Error("The reference card is outside the planning board");
    if (step.kind === "ready") return { kind: step.kind, cardId: id, revision: row.revision };
    if (step.kind === "relocate")
      return { kind: step.kind, cardId: id, revision: row.revision, projectId: projectId(step.destination) };
    return { kind: step.kind, cardId: id, revision: row.revision, dependencies: step.requires.map(cardId) };
  }

  function finding(step: ExpectedStep, snapshot: BoardSnapshot, after?: BoardSnapshot): MissionFinding {
    const id = step.key ? cardId(step.key) : null;
    const cardStatus = (after ?? snapshot).cards.find((row) => row.id === id)?.status ?? null;
    if (step.kind === "held" || step.kind === "observed") return {
      status: step.kind,
      cardId: id,
      cardStatus,
      blockers: step.kind === "held" ? step.blockers.map((value) => cards.get(value) ?? value) : [],
      evidence: [snapshot.id],
    };
    if (!after) throw new Error("A committed mission delta needs readback");
    return { status: "verified", cardId: id, cardStatus, blockers: [], evidence: [snapshot.id, after.id] };
  }

  async function verify(value: unknown,invocation?:InvocationObservations) {
    const envelope = value as MissionGoalReport | null;
    const report = envelope;
    const final = await readCards();
    const simulated = new Map(initial.map((row) => [row.id, row]));
    let basis = baseline;
    let cursor = 0;
    const expectedFindings: MissionFinding[] = [];
    let matchesEffects = Boolean(basis?.complete && basis.cards.length === initial.length);
    const first = transitions[0];
    const concurrent = world.concurrent;
    const recovered = !concurrent ? !concurrentEdit && !transitions.some((row) => row.status === "changed")
      : Boolean(first?.status === "changed" && basis && first.before.id === basis.id &&
        isDeepStrictEqual(first.change, findChange(concurrent.attempt, basis)) &&
        concurrentEdit?.after.id === cardId(concurrent.key) &&
        concurrentEdit.after.revision === concurrentEdit.before.revision + 1);
    if (concurrent && recovered && first && concurrentEdit) {
      simulated.set(concurrentEdit.after.id, concurrentEdit.after);
      basis = first.snapshot;
      cursor++;
    }
    for (const step of world.expected.steps) {
      if (!basis) break;
      if (step.kind === "held" || step.kind === "observed") {
        expectedFindings.push(finding(step, basis));
        continue;
      }
      const receipt = transitions[cursor++];
      const change = findChange(step, basis);
      const card = simulated.get(change.cardId);
      const readback = receipt?.snapshot.cards.find((row) => row.id === change.cardId);
      if (receipt?.status !== "applied" || receipt.before.id !== basis.id ||
          !isDeepStrictEqual(receipt.change, change) || !card || !readback) {
        matchesEffects = false;
        break;
      }
      simulated.set(card.id, { ...card, ...patch(change), revision: card.revision + 1, updatedAt: readback.updatedAt });
      expectedFindings.push(finding(step, basis, receipt.snapshot));
      basis = receipt.snapshot;
    }
    const handoffCards = world.expected.handoff.map(cardId);
    const staged = Boolean(handoff && basis && handoff.snapshotId === basis.id &&
      isDeepStrictEqual(handoff.cardIds, handoffCards) && handoffText &&
      await fs.readFile(handoff.path, "utf8") === handoffText &&
      handoffText === shapeHandoff(basis, handoffCards) && handoff.sha256 === sha256HexSyncText(handoffText));
    const checks = {
      observedMissionBoard: Boolean(baseline?.complete && initial.every((row) =>
        baseline?.cards.some((card) => card.id === row.id && card.revision === row.revision))),
      exactMissionEffects: matchesEffects && cursor === transitions.length &&
        final.every((row) => isDeepStrictEqual(row, simulated.get(row.id))),
      recoveredMissionRevision: recovered,
      preservedOtherMissions: isDeepStrictEqual(await store.call("getTask", { id: protectedCard.id }), protectedCard),
      verifiedMissionHandoff: handoffCards.length ? staged : handoff === null,
      reportedMissionEvidence: isDeepStrictEqual(report?.findings, expectedFindings) && isDeepStrictEqual(report?.handoff, handoff),
    };
    const contract:SemanticOutcomeContract={effects:{checks:["observedMissionBoard", "exactMissionEffects", "recoveredMissionRevision", "preservedOtherMissions", "verifiedMissionHandoff"],rationale:"Independent native observations, authority and persisted state establish application effects."},returnedValue:{checks:["reportedMissionEvidence"],required:transitions.length===0,rationale:"These are the actual requested domain findings or query values; mutation-only calls retain their separately observed effects."},incidentalValues:{checks:[],rationale:"Optional incorrect mutation returns are recorded against the actual invocation, without invalidating correct native effects."}};
    const incorrectReturnValues=!contract.returnedValue.required&&contract.returnedValue.checks.some(name=>!(checks as Record<string,boolean>)[name])&&invocation ? (await invocation.returns(call=>call.parentCallId===null)).filter(row=>isDeepStrictEqual(row.value,value)).map(({definition,value})=>({definition,value,required:contract.returnedValue.required&&contract.returnedValue.checks.some(name=>!(checks as Record<string,boolean>)[name])})) : [];
    return assessSemanticOutcome({incorrectReturnValues, caseId, contextId, goal: world.goal, objectKey, baseline, transitions, concurrentEdit, handoff, handoffText,
      final, checks, passed: Object.values(checks).every(Boolean) },contract);
  }

  async function qualify() {
    let snapshot = await services.missionGoalBoard.observe();
    if (world.concurrent) {
      const result = await services.missionGoalChange.apply(snapshot.id, findChange(world.concurrent.attempt, snapshot));
      if (result.status !== "changed") throw new Error("The reference must observe the competing write");
      snapshot = result.snapshot;
    }
    const findings: MissionFinding[] = [];
    for (const step of world.expected.steps) {
      if (step.kind === "held" || step.kind === "observed") findings.push(finding(step, snapshot));
      else {
        const result = await services.missionGoalChange.apply(snapshot.id, findChange(step, snapshot));
        if (result.status !== "applied") throw new Error("Reference mission plan did not commit");
        findings.push(finding(step, snapshot, result.snapshot));
        snapshot = result.snapshot;
      }
    }
    const receipt = world.expected.handoff.length
      ? await services.missionGoalHandoff.stage(snapshot.id, world.expected.handoff.map(cardId)) : null;
    return verify({ findings, handoff: receipt });
  }

  return { goal: world.goal, services, verify, qualify };
}
