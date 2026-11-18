import type {
  PersonalMemoryKind,
  PersonalWorkflowReport,
} from "../personal-workflows/types.js";
import type { PersonalWorld } from "./worlds.js";

export type PersonalMemoryRequestReceipt = {
  query: string;
  kinds?: PersonalMemoryKind[];
  limit?: number;
};

const sameMembers = (found: readonly string[], expected: readonly string[]) =>
  found.length === expected.length &&
  [...found]
    .sort()
    .every((value, index) => value === [...expected].sort()[index]);

/** Returns mismatch descriptions from private authored expectations and the outside-world receipt. */
export function verifyPersonalWorld(
  world: PersonalWorld,
  report: PersonalWorkflowReport,
  memoryRequests: PersonalMemoryRequestReceipt[],
): string[] {
  const errors: string[] = [];
  if (report.results.length !== world.expected.length)
    errors.push("Work count differs");
  const memoryWork = world.work.find((work) => work.kind === "recallWorkspace");
  const call = memoryRequests[0];
  if (memoryWork) {
    if (
      memoryRequests.length !== 1 ||
      !call ||
      call.limit !== 8 ||
      !call.query.trim() ||
      !sameMembers(call.kinds ?? [], memoryWork.input.kinds)
    )
      errors.push("Recall did not stay within the assigned scope");
    else {
      const terms =
        memoryWork.input.query.toLowerCase().match(/[a-z0-9]{4,}/g) ?? [];
      if (
        terms.length &&
        !terms.some((term) => call.query.toLowerCase().includes(term))
      )
        errors.push("Recall discarded distinguishing query terms");
    }
  } else if (memoryRequests.length) errors.push("Unexpected memory request");

  for (const [index, expected] of world.expected.entries()) {
    const result = report.results[index];
    if (
      result?.kind === "recallWorkspace" &&
      expected.kind === "recallWorkspace"
    ) {
      if (result.report.query !== memoryRequests[0]?.query)
        errors.push("Reported query lacks the original dispatch");
      const expectedEvidence = world.memory.flatMap((source, i) => {
        const id = `e${i + 1}`;
        return expected.cited.includes(id) ? [{ id, ...source }] : [];
      });
      const returnedEvidence = result.report.evidence;
      if (
        !sameMembers(
          returnedEvidence.map((row) => row.id),
          expected.cited,
        ) ||
        returnedEvidence.some(
          (row) =>
            !expectedEvidence.some(
              (source) =>
                source.id === row.id &&
                source.kind === row.kind &&
                source.where === row.where &&
                source.snippet === row.snippet &&
                source.appendedAt === row.appendedAt &&
                row.path === (source.path ?? null) &&
                row.eventId === (source.eventId ?? null) &&
                row.logId === (source.logId ?? null) &&
                row.head === (source.head ?? null) &&
                row.contentHash === (source.contentHash ?? null),
            ),
        )
      )
        errors.push("Reported evidence differs from original relevant records");
      const citations = new Set(
        result.report.claims.flatMap((claim) => claim.evidenceIds),
      );
      if (!sameMembers([...citations], expected.cited))
        errors.push("Claims have incorrect or missing citations");
      for (const claim of result.report.claims) {
        const records = expectedEvidence.filter((source) =>
          claim.evidenceIds.includes(source.id),
        );
        const terms =
          claim.statement.toLowerCase().match(/[a-z0-9]{5,}/g) ?? [];
        const numbers = claim.statement.match(/\d+(?:[.,:]\d+)*/g) ?? [];
        if (
          !records.length ||
          !terms.some((term) =>
            records.some((record) =>
              record.snippet.toLowerCase().includes(term),
            ),
          ) ||
          numbers.some(
            (number) =>
              !records.some((record) => record.snippet.includes(number)),
          )
        )
          errors.push("Claim lacks textual support");
      }
      if (
        result.report.status !== expected.status ||
        !sameMembers(result.report.verify, expected.verify)
      )
        errors.push("History status or verification targets differ");
    } else if (
      result?.kind === "routeSetup" &&
      expected.kind === "routeSetup"
    ) {
      const {
        action,
        routeId,
        workspaceScope,
        capabilityIds,
        unknownIds,
        brief,
      } = result.report;
      const setupWork = world.work.find((work) => work.kind === "routeSetup");
      if (
        action !== expected.action ||
        routeId !== expected.routeId ||
        workspaceScope !== expected.scope ||
        !sameMembers(unknownIds, expected.unknown) ||
        !brief.trim() ||
        capabilityIds.some(
          (id) =>
            !setupWork?.input.capabilities.some(
              (capability) => capability.id === id,
            ),
        )
      )
        errors.push("Setup route or state differs from the owner observation");
    } else if (
      result?.kind === "planRepositoryWork" &&
      expected.kind === "planRepositoryWork"
    ) {
      const { repository, operation, access, decision, next } = result.report;
      const repoWork = world.work.find(
        (work) => work.kind === "planRepositoryWork",
      );
      if (
        repository !== repoWork?.input.repository ||
        operation !== expected.operation ||
        access !== expected.access ||
        decision !== expected.decision ||
        next.every((item) => !item.trim())
      )
        errors.push(
          "Repository plan differs from the assigned state or access",
        );
    } else errors.push("Unexpected work result or execution order");
  }
  return errors;
}
