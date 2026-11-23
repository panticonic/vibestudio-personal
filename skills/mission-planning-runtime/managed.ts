import { isDeepStrictEqual } from "node:util";
import {
  contextId,
  createDurableObjectServiceClient,
} from "@workspace/runtime";
import type { Task } from "@workspace/mission-control";
import { missionControlRpcMethods } from "@workspace/mission-control/rpc-contract";
import { bindMissionPlanning } from "./index.js";
import type {
  FacilityReview,
  MissionFacilityEvidence,
} from "../personal-facility-review/types.js";
import type {
  MissionChanges,
  MissionFinding,
  MissionPlanningReport,
  MissionPlanningRequest,
  MissionSnapshot,
  MissionStatus,
} from "../mission-planning/types.js";

type Seed = {
  projects: readonly { key: string; name: string; archived?: boolean }[];
  cards: readonly {
    key: string;
    project: string;
    title: string;
    status: MissionStatus;
    requires: readonly string[];
  }[];
};
type Outcome =
  | { kind: "held"; codes: string[] }
  | { kind: "ready"; key: string }
  | { kind: "relocate"; key: string; project: string }
  | { kind: "prerequisites"; key: string; requires: string[] };
type World = {
  id: string;
  request: MissionPlanningRequest;
  expected: readonly Outcome[];
};

function fixtureStore() {
  const objectKey = `natlang-mission-planning-${contextId}`;
  const client = createDurableObjectServiceClient(
    "mission-planning-fixture.v1",
    missionControlRpcMethods,
    objectKey,
  );
  return { objectKey, client };
}

export async function prepareManagedMissionPlanning(world: World, seed: Seed) {
  const { objectKey, client } = fixtureStore();
  const projects = new Map<string, string>();
  const cards = new Map<string, string>();
  const key = (keys: Map<string, string>, name: string) => {
    const value = keys.get(name);
    if (!value) throw new Error(`Missing fixture key ${name}`);
    return value;
  };
  const projectId = (name: string) => key(projects, name);
  const cardId = (name: string) => key(cards, name);
  for (const item of seed.projects) {
    const project = await client.call("createProject", {
      name: item.name,
      repos: [],
    });
    projects.set(item.key, project.id);
  }
  for (const item of seed.cards) {
    const task = await client.call("createTask", {
      projectId: projectId(item.project),
      title: item.title,
      status: item.status,
      dependencies: item.requires.map(cardId),
      description: `Assigned to ${item.title}`,
      tags: ["native-planning-review"],
      checklist: [
        { id: "verify", text: "Verify the assigned result", done: false },
      ],
    });
    cards.set(item.key, task.id);
  }
  const outside = await client.call("createProject", {
    name: "Unassigned live project",
    repos: [],
  });
  const outsideCard = await client.call("createTask", {
    projectId: outside.id,
    title: "Preserve this card",
  });
  for (const item of seed.projects) {
    if (item.archived)
      await client.call("updateProject", {
        id: projectId(item.key),
        expectedRevision: 1,
        changes: { archived: true },
      });
  }
  const readCards = async () =>
    Promise.all(
      [...cards.values()].map((id) => client.call("getTask", { id })),
    );
  const initial = await readCards();
  const bound = bindMissionPlanning(
    {
      async projects() {
        return (await client.call("overview", { limit: 1 })).projects;
      },
      cards: (id, options) =>
        client.call("taskOptions", { ...options, projectId: id }),
      update: (change) => client.call("updateTask", change),
    },
    [...projects.values()],
  );
  let baseline: MissionSnapshot | undefined;
  const transitions: { change: MissionChanges; after: MissionSnapshot }[] = [];
  const services = {
    missionPlanningState: {
      async observe() {
        if (baseline)
          throw new Error("The case has one initial planning observation");
        baseline = await bound.missionPlanningState.observe();
        return structuredClone(baseline);
      },
    },
    missionPlanningChange: {
      async apply(id: string, change: MissionChanges) {
        const after = await bound.missionPlanningChange.apply(id, change);
        transitions.push({
          change: structuredClone(change),
          after: structuredClone(after),
        });
        return after;
      },
    },
  };

  function changeFor(
    outcome: Exclude<Outcome, { kind: "held" }>,
    state: MissionSnapshot,
  ): MissionChanges {
    const id = cardId(outcome.key);
    const revision = state.cards.find((card) => card.id === id)?.revision;
    if (revision === undefined)
      throw new Error("Assigned card missing from the planning board");
    const base = { cardId: id, revision };
    if (outcome.kind === "prerequisites")
      return {
        ...base,
        kind: "prerequisites",
        dependencies: outcome.requires.map(cardId),
      };
    if (outcome.kind === "relocate")
      return {
        ...base,
        kind: "relocate",
        projectId: projectId(outcome.project),
      };
    return { ...base, kind: "ready" };
  }

  const held = (
    outcome: Extract<Outcome, { kind: "held" }>,
    before: MissionSnapshot,
  ): MissionFinding => ({
    status: "held",
    cardId: null,
    blockers: outcome.codes.map((code) => cards.get(code) ?? code),
    evidence: [before.id],
  });
  const verified = (
    id: string,
    before: MissionSnapshot,
    after: MissionSnapshot,
  ): MissionFinding => ({
    status: "verified",
    cardId: id,
    blockers: [],
    evidence: [before.id, after.id],
  });
  const patchFor = (change: MissionChanges) => {
    if (change.kind === "prerequisites")
      return { dependencies: change.dependencies };
    if (change.kind === "relocate") return { projectId: change.projectId };
    return { status: "ready" as const };
  };

  async function verify(report: MissionPlanningReport | null) {
    let before = baseline;
    const simulated = new Map(
      initial.map((row) => [row.id, structuredClone(row)]),
    );
    const findings: MissionFinding[] = [];
    let used = 0;
    const checks = {
      baseline:
        baseline?.complete === true &&
        baseline.cards.length === initial.length &&
        initial.every((row) =>
          baseline?.cards.some(
            (card) =>
              card.id === row.id &&
              card.projectId === row.projectId &&
              card.revision === row.revision,
          ),
        ),
      outside: isDeepStrictEqual(
        await client.call("getTask", { id: outsideCard.id }),
        outsideCard,
      ),
      exactEffects: false,
      report: false,
    };
    if (before?.complete) {
      checks.exactEffects =
        world.expected.every((outcome) => {
          if (!before) return false;
          if (outcome.kind === "held") {
            findings.push(held(outcome, before));
            return true;
          }
          const receipt = transitions[used++];
          const change = changeFor(outcome, before);
          if (
            !receipt ||
            !receipt.after.complete ||
            receipt.after.id === before.id ||
            !isDeepStrictEqual(receipt.change, change) ||
            !isDeepStrictEqual(receipt.after.projects, before.projects)
          )
            return false;
          const updated = receipt.after.cards.find(
            (card) => card.id === change.cardId,
          );
          const old = simulated.get(change.cardId);
          if (!old || !updated) return false;
          const fields = {
            ...old,
            ...patchFor(change),
            revision: old.revision + 1,
            updatedAt: updated.updatedAt,
          };
          simulated.set(old.id, fields);
          const matches = (row: MissionSnapshot["cards"][number]) => {
            const expected = simulated.get(row.id);
            return (
              expected &&
              Object.entries(row).every(([name, value]) =>
                isDeepStrictEqual(expected[name as keyof Task], value),
              )
            );
          };
          if (
            receipt.after.cards.length !== simulated.size ||
            !receipt.after.cards.every(matches)
          )
            return false;
          findings.push(verified(change.cardId, before, receipt.after));
          before = receipt.after;
          return true;
        }) && used === transitions.length;
      checks.exactEffects &&= (await readCards()).every((row) =>
        isDeepStrictEqual(row, simulated.get(row.id)),
      );
      checks.report = isDeepStrictEqual(report?.findings, findings);
    }
    return {
      caseId: world.id,
      contextId,
      objectKey,
      baseline,
      transitions,
      assignments: {
        cards: Object.fromEntries(cards),
        projects: Object.fromEntries(projects),
      },
      checks,
      passed: Object.values(checks).every(Boolean),
    };
  }

  async function qualify() {
    const first = initial[0]!;
    let rejectsStale = false;
    try {
      await client.call("updateTask", {
        id: first.id,
        expectedRevision: first.revision + 1,
        changes: { title: "Stale mutation" },
      });
    } catch (error) {
      rejectsStale =
        error instanceof Error && /changed|revision|newer/i.test(error.message);
    }
    let before = await services.missionPlanningState.observe();
    const findings: MissionFinding[] = [];
    for (const outcome of world.expected) {
      if (outcome.kind === "held") {
        findings.push(held(outcome, before));
        continue;
      }
      const change = changeFor(outcome, before);
      const after = await services.missionPlanningChange.apply(
        before.id,
        change,
      );
      findings.push(verified(change.cardId, before, after));
      before = after;
    }
    const verification = await verify({ findings });
    const rejectsWrongReceipt = !(
      await verify({
        findings: findings.map((finding) => ({
          ...finding,
          evidence: ["unobserved"],
        })),
      })
    ).passed;
    return { verification, rejectsStale, rejectsWrongReceipt };
  }

  return { request: world.request, services, verify, qualify };
}

type FacilityWorld = {
  id: string;
  goal: string;
  stale: boolean;
  prerequisite: "done" | "review";
  status: FacilityReview["status"];
  code: string;
};

export async function prepareManagedMissionFacility(world: FacilityWorld) {
  const { client } = fixtureStore();
  const project = await client.call("createProject", { name: "Assigned launch project", repos: [] });
  const prerequisite = await client.call("createTask", {
    projectId: project.id, title: "Accept release evidence", status: world.prerequisite,
  });
  const assigned = await client.call("createTask", {
    projectId: project.id, title: "Prepare the release run", status: "ready",
    dependencies: [prerequisite.id],
  });
  if (world.stale) {
    await client.call("updateTask", {
      id: assigned.id, expectedRevision: assigned.revision,
      changes: { description: "The owner revised the release scope." },
    });
  }
  const read = async () => {
    const [card, dependency, board] = await Promise.all([
      client.call("getTask", { id: assigned.id }),
      client.call("getTask", { id: prerequisite.id }),
      client.call("overview", { limit: 1 }),
    ]);
    const currentProject = board.projects.find(({ id }) => id === card.projectId);
    if (currentProject?.id !== project.id || card.dependencies.length !== 1 ||
        card.dependencies[0] !== dependency.id)
      throw new Error("The assigned planning records no longer join");
    return { card, dependency, project: currentProject };
  };
  const baseline = await read();
  const operationId = crypto.randomUUID();
  const request = { kind: "mission-live", goal: world.goal, operationId };
  let observed: MissionFacilityEvidence | undefined;
  const services = {
    missionFacilityRead: {
      async inspect(id: string) {
        if (id !== operationId)
          throw new Error("Read only the assigned Mission Control card");
        const current = await read();
        observed = {
          kind: "mission",
          goal: world.goal,
          target: { id: operationId, taskId: assigned.id, expectedRevision: assigned.revision },
          card: {
            id: current.card.id, taskId: current.card.id, revision: current.card.revision,
            state: current.card.status, projectArchived: current.project.archived,
            dependencyAccepted: current.dependency.status === "done",
            automationId: current.card.automationId,
          },
          detail: { kind: "execution", intent: "start", automationKind: null, receipt: null },
        };
        return structuredClone(observed);
      },
    },
  };
  const expected: FacilityReview = {
    status: world.status,
    findings: [{ code: world.code, evidenceIds: world.stale ? [operationId, assigned.id] : [assigned.id] }],
  };
  async function verify(report: FacilityReview | null) {
    const after = await read();
    const checks = {
      attribution: observed?.target.taskId === assigned.id && observed?.card.id === assigned.id &&
        observed.target.expectedRevision === assigned.revision && observed.card.revision === baseline.card.revision,
      assignedState: observed?.card.state === "ready" && !observed.card.projectArchived &&
        observed.card.automationId === null && baseline.dependency.status === world.prerequisite &&
        observed.card.dependencyAccepted === (world.prerequisite === "done") &&
        baseline.card.revision === assigned.revision + Number(world.stale),
      preserved: isDeepStrictEqual(after, baseline),
      outcome: isDeepStrictEqual(report, expected),
    };
    return {
      contextId, caseId: world.id, request, observed,
      checks, passed: Object.values(checks).every(Boolean),
    };
  }
  return {
    request, services, verify,
    async qualify() {
      await services.missionFacilityRead.inspect(operationId);
      return verify(expected);
    },
  };
}
