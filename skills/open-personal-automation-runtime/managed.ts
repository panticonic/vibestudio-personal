import {assessSemanticOutcome,type SemanticOutcomeContract} from "@workspace-skills/system-testing/semantic-outcome-contract";
import { isDeepStrictEqual } from "node:util";
import { contextId as liveContext, missions } from "@workspace/runtime";
import type {
  Action,
  Disposition,
  Finding,
  Monitor,
  Queue,
  Receipt,
  Report,
  State,
  Status,
} from "../open-personal-automation/types.js";

type Fault =
  | "before-review"
  | "revision-race"
  | "lost-ack"
  | "lost-before-dispatch"
  | "after-effect-edit"
  | "already-race";
type Spec = {
  key: string;
  name: string;
  team: string;
  initial: State;
  needs?: string[];
  permitted?: Action[];
  fault?: Fault;
  reviewed?: false;
};
type Expected = {
  key: string;
  name?: string;
  status: Status;
  state: State | null;
  attempt?: Action;
};
type World = {
  id: string;
  goal: string;
  monitors: Spec[];
  expected: {
    findings: Expected[];
    disposition: Disposition;
    order?: string[];
  };
};
type Mission = NonNullable<Awaited<ReturnType<typeof missions.get>>>;
type Metadata = {
  team: string;
  needs: string[];
  permitted: Action[];
  note?: string;
};
type Owned = { spec: Spec; seed: Mission; suffix: string; metadata: Metadata };
type Seed = { defaultMonitor: Mission; items: { key: string; record: Mission; suffix: string }[] };
type Op = {
  key: string;
  id: string;
  basis: string;
  action: Action;
  receipt?: Receipt;
  effect?: "controller" | "peer";
  guard?: boolean;
  followup?: string;
};
type Envelope = Report;

const desiredState = (action: Action): State =>
  action === "pause" ? "paused" : "active";
const defaultId = "workspace-updates";
const own = (source: Mission) => ({
  id: source.missionId,
  name: source.name,
  owner: source.owner,
  charter: source.charter,
  authorityPlan: source.authorityPlan,
});
const revision = (source: Mission) => ({
  digest: source.revisionDigest,
  ordinal: source.revision,
});
const revisedCharter = (basis: Owned) => ({
  ...basis.seed.charter,
  summary: JSON.stringify({
    ...basis.metadata,
    note: "Definition updated by its owner",
  }),
});
const activeState = (mission: Mission): State => {
  if (mission.state !== "active" && mission.state !== "paused")
    throw new Error(
      "Owned automation no longer has reversible scheduling state",
    );
  return mission.state;
};

export async function prepareOpenPersonalAutomation(
  input: { contextId: string; caseId: string },
  world: World,
  seed: Seed,
) {
  if (input.contextId !== liveContext || input.caseId !== world.id)
    throw new Error("Automation queue belongs to another context");
  const { defaultMonitor, items } = seed;
  const owned = new Map<string, Owned>();
  const attempts: Op[] = [];
  const requests: { id: string; action: Action }[] = [];
  const observations: Queue[] = [];
  let current: Queue | undefined;
  let pending = false;

  function fromId(id: string) {
    return [...owned.values()].find(({ seed }) => seed.missionId === id);
  }

  function project(record: Mission, item: Owned): Monitor {
    if (
      record.missionId !== item.seed.missionId ||
      !record.name.endsWith(item.suffix) ||
      record.charter.trigger.kind !== "manual"
    )
      throw new Error("Unexpected automation controller identity or trigger");
    const details = JSON.parse(record.charter.summary) as Metadata;
    return {
      id: record.missionId,
      name: record.name.slice(0, -item.suffix.length),
      team: details.team,
      state: activeState(record),
      revision: record.revisionDigest,
      reviewedRevision:
        item.spec.reviewed === false ? null : item.seed.revisionDigest,
      needs: details.needs.map(
        (key) => owned.get(key)?.seed.missionId ?? `unavailable:${key}`,
      ),
      permitted: details.permitted,
    };
  }

  async function snapshot() {
    const live = await Promise.all(
      [...owned.values()].map(async (item) => {
        const row = await missions.get(item.seed.missionId);
        if (!row) throw new Error("Owned automation unexpectedly disappeared");
        return { row, item, monitor: project(row, item) };
      }),
    );
    return live;
  }

  async function exclusive<T>(run: () => Promise<T>) {
    if (pending) throw new Error("Wait for the current scheduling operation");
    pending = true;
    try {
      return await run();
    } finally {
      pending = false;
    }
  }

  if (items.length !== world.monitors.length)
    throw new Error("The owned automation seed is incomplete");
  for (const spec of world.monitors) {
    const seeded = items.find(({ key }) => key === spec.key);
    if (!seeded) throw new Error("The owned automation seed is missing a monitor");
    const { record, suffix } = seeded;
    const observed = await missions.get(record.missionId);
    if (!observed || !isDeepStrictEqual(own(observed), own(record)) ||
        !isDeepStrictEqual(revision(observed), revision(record)) ||
        observed.state !== spec.initial || observed.charter.trigger.kind !== "manual")
      throw new Error("Automation seed differs from the live owned manual monitor");
    const item = { spec, seed: record, suffix, metadata: JSON.parse(record.charter.summary) as Metadata };
    owned.set(spec.key, item);
    if (spec.fault === "before-review")
      await missions.edit(record.missionId, { charter: revisedCharter(item) });
  }

  const services = {
    operatorQueue: {
      observe: () =>
        exclusive(async () => {
          current = {
            id: crypto.randomUUID(),
            monitors: (await snapshot()).map(({ monitor }) => monitor),
          };
          observations.push(current);
          for (const attempt of attempts) attempt.followup ??= current.id;
          return structuredClone(current);
        }),
      apply: (basis: string, id: string, action: Action) =>
        exclusive(async (): Promise<Receipt> => {
          const start = observations.find(row=>row.id===basis);
          const item = fromId(id);
          const previous = start?.monitors.find((row) => row.id === id);
          if (
            !item ||
            !start ||
            start.id !== basis ||
            !previous ||
            (action !== "pause" && action !== "resume")
          )
            throw new Error("Use an observed owned monitor and current queue");
          const live = (await snapshot()).map(({ monitor }) => monitor);
          const target = live.find((row) => row.id === id);
          if (
            !target ||
            target.revision !== previous.revision ||
            target.revision !== target.reviewedRevision ||
            (action === "resume" &&
              !target.needs.every((need) =>
                live.some(
                  (row) =>
                    row.id === need &&
                    row.state === "active" &&
                    row.revision === row.reviewedRevision,
                ),
              ))
          )
            return "blocked";
          if (target.state === desiredState(action)) return "already";
          if (!target.permitted.includes(action)) return "blocked";
          if (
            attempts.some((attempt) => attempt.id === id || !attempt.followup)
          )
            throw new Error(
              "Read back the current transition and only attempt each control once",
            );
          requests.push({ id, action });
          const attempt: Op = { key: item.spec.key, basis, id, action };
          attempts.push(attempt);
          const fault = item.spec.fault;
          const finish = (receipt: Receipt) => {
            attempt.receipt = receipt;
            return receipt;
          };
          if (fault === "lost-before-dispatch") return finish("interrupted");
          if (fault === "revision-race")
            await missions.edit(id, { charter: revisedCharter(item) });
          try {
            const changed = await missions.transitionAtRevision(
              id,
              action,
              target.revision,
            );
            if (
              changed.missionId !== id ||
              changed.state !== desiredState(action) ||
              changed.revisionDigest !== target.revision
            )
              return finish("interrupted");
            attempt.effect = fault === "already-race" ? "peer" : "controller";
            if (fault === "after-effect-edit")
              await missions.edit(id, { charter: revisedCharter(item) });
            if (
              fault === "after-effect-edit" ||
              fault === "lost-ack" ||
              fault === "already-race"
            )
              return finish("interrupted");
            return finish("applied");
          } catch (error) {
            attempt.guard = Boolean(
              error &&
              typeof error === "object" &&
              "code" in error &&
              error.code === "MISSION_REVISION_CHANGED",
            );
            return finish(attempt.guard ? "blocked" : "interrupted");
          }
        }),
    },
  };

  async function verify(value: unknown) {
    const envelope = value as Envelope | null;
    const report =
      envelope;
    const [live, protectedMonitor] = await Promise.all([
      snapshot(),
      missions.getDefault(defaultId),
    ]);
    const runPages = await Promise.all(
      live.map(({ row }) => missions.listRuns(row.missionId, { limit: 1 })),
    );
    const actualFindings = Array.isArray(report?.findings)
      ? report.findings
      : [];
    const expected = new Map(
      world.expected.findings.map((item) => [item.key, item]),
    );
    const history = new Map(
      observations.map((item, index) => [item.id, { item, index }]),
    );
    const byKey = new Map(live.map((row) => [row.item.spec.key, row]));
    const attemptedKeys = world.expected.findings.flatMap(({ key, attempt }) =>
      attempt ? [key] : [],
    );
    const order = world.expected.order ?? [];
    const goalReportMatches =
      actualFindings.length === expected.size &&
      world.expected.findings.every((wanted) => {
        const target = byKey.get(wanted.key)?.monitor;
        const name = target?.name ?? wanted.name;
        const id = target?.id ?? null;
        const reported = actualFindings.filter(
          (row) => row?.id === id && row.name === name,
        );
        if (reported.length !== 1) return false;
        const finding = reported[0]!;
        const captured = history.get(finding.evidence);
        const actual = captured?.item.monitors.find(
          (monitor) => monitor.id === id,
        );
        const attempt = attempts.find(({ key }) => key === wanted.key);
        const readback = attempt?.followup
          ? history.get(attempt.followup)
          : undefined;
        return Boolean(
          captured &&
          finding.status === wanted.status &&
          (readback === undefined || captured.index >= readback.index) &&
          finding.state === wanted.state &&
          finding.revision === (target?.revision ?? null) &&
          finding.reviewedRevision === (target?.reviewedRevision ?? null) &&
          (target
            ? isDeepStrictEqual(actual, target)
            : !captured.item.monitors.some((monitor) => monitor.name === name)),
        );
      });
    const edited = (spec: Spec) =>
      spec.fault === "before-review" ||
      spec.fault === "revision-race" ||
      spec.fault === "after-effect-edit";
    const checks = {
      authorizedSchedulingState:
        live.every(({ item, row, monitor }) => {
          const wanted = expected.get(item.spec.key);
          const didEdit = edited(item.spec);
          return (
            monitor.state === (wanted?.state ?? item.spec.initial) &&
            isDeepStrictEqual(own(row), {
              ...own(item.seed),
              ...(didEdit ? { charter: revisedCharter(item) } : {}),
            }) &&
            (didEdit
              ? row.revision === item.seed.revision + 1 &&
                row.revisionDigest !== item.seed.revisionDigest
              : isDeepStrictEqual(revision(row), revision(item.seed)))
          );
        }) &&
        isDeepStrictEqual(
          attempts.map(({ key }) => key).sort(),
          [...attemptedKeys].sort(),
        ) &&
        attempts.every(
          ({ key, action }) => expected.get(key)?.attempt === action,
        ) &&
        isDeepStrictEqual(
          requests,
          attempts.map(({ id, action }) => ({ id, action })),
        ) &&
        isDeepStrictEqual(
          attempts.map(({ key }) => key).filter((key) => order.includes(key)),
          order,
        ),
      observedLiveDefinitions: Boolean(
        observations[0] &&
        observations[0].monitors.length === owned.size &&
        observations[0].monitors.every((monitor) => {
          const item = fromId(monitor.id);
          return (
            item &&
            monitor.name === item.spec.name &&
            monitor.team === item.spec.team &&
            monitor.state === item.spec.initial &&
            monitor.reviewedRevision ===
              (item.spec.reviewed === false
                ? null
                : item.seed.revisionDigest) &&
            (item.spec.fault === "before-review"
              ? monitor.revision !== item.seed.revisionDigest
              : monitor.revision === item.seed.revisionDigest)
          );
        }),
      ),
      independentReadback: attempts.every(({ basis, followup, id }) => {
        const first = history.get(basis);
        const last = followup ? history.get(followup) : undefined;
        return Boolean(
          first &&
          last &&
          first.index < last.index &&
          last.item.monitors.some((row) => row.id === id),
        );
      }),
      matchedGoalReport:
        goalReportMatches && report?.disposition === world.expected.disposition,
      protectedWorkspaceMonitor: Boolean(
        protectedMonitor &&
        protectedMonitor.state === defaultMonitor.state &&
        isDeepStrictEqual(own(protectedMonitor), own(defaultMonitor)) &&
        isDeepStrictEqual(revision(protectedMonitor), revision(defaultMonitor)),
      ),
      noRunsDispatched:
        runPages.every(
          ({ items, nextCursor }) => !items.length && nextCursor === undefined,
        ) &&
        live.every(
          ({ item, row }) =>
            row.runCount === item.seed.runCount &&
            row.runCount === 0 &&
            row.nextRunAt === undefined &&
            row.lastRunAt === undefined &&
            row.charter.trigger.kind === "manual",
        ),
      expectedRecovery: attempts.every(({ key, receipt, effect, guard }) => {
        const fault = owned.get(key)?.spec.fault;
        if (fault === "revision-race")
          return receipt === "blocked" && guard === true && !effect;
        if (fault === "already-race")
          return receipt === "interrupted" && effect === "peer";
        if (fault === "lost-before-dispatch")
          return receipt === "interrupted" && !effect;
        if (fault === "lost-ack" || fault === "after-effect-edit")
          return receipt === "interrupted" && effect === "controller";
        return receipt === "applied" && effect === "controller";
      }),
    };
    const contract:SemanticOutcomeContract={effects:{checks:["authorizedSchedulingState", "observedLiveDefinitions", "independentReadback", "protectedWorkspaceMonitor", "noRunsDispatched", "expectedRecovery"],rationale:"Independent native observations, authority and persisted state establish application effects."},returnedValue:{checks:["matchedGoalReport"],required:true,rationale:"These are the actual requested domain findings or query values; mutation-only calls retain their separately observed effects."},incidentalValues:{checks:[],rationale:"Optional incorrect mutation returns are recorded against the actual invocation, without invalidating correct native effects."}};
    return assessSemanticOutcome({
      caseId: world.id,
      contextId: input.contextId,
      goal: world.goal,
      initial: observations[0],
      latest: observations.at(-1),
      independent: live.map(({ monitor }) => monitor),
      attempts,
      requests,
      checks,
      passed: Object.values(checks).every(Boolean),
    },contract);
  }

  async function qualify() {
    let queue = await services.operatorQueue.observe();
    const ordered = world.expected.order ?? [];
    const reference = [
      ...ordered,
      ...world.expected.findings
        .map(({ key }) => key)
        .filter((key) => !ordered.includes(key)),
    ];
    for (const key of reference) {
      const wanted = world.expected.findings.find((item) => item.key === key);
      if (!wanted?.attempt) continue;
      await services.operatorQueue.apply(
        queue.id,
        owned.get(key)!.seed.missionId,
        wanted.attempt,
      );
      queue = await services.operatorQueue.observe();
    }
    const findings: Finding[] = world.expected.findings.map((wanted) => {
      const target = queue.monitors.find(
        ({ id }) => id === owned.get(wanted.key)?.seed.missionId,
      );
      return {
        name: target?.name ?? wanted.name!,
        id: target?.id ?? null,
        state: target?.state ?? null,
        status: wanted.status,
        revision: target?.revision ?? null,
        reviewedRevision: target?.reviewedRevision ?? null,
        evidence: queue.id,
      };
    });
    const envelope: Envelope = { findings, disposition: world.expected.disposition };
    const verified = await verify(envelope);
    const altered = structuredClone(envelope);
    altered.findings[0]!.evidence = "fabricated-queue";
    const rejectedUnboundEvidence = !(await verify(altered)).passed;
    return {
      ...verified,
      rejectedUnboundEvidence,
      passed: verified.passed && rejectedUnboundEvidence,
    };
  }

  return { goal: world.goal, services, verify, qualify };
}
