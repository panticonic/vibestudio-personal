import {assessSemanticOutcome,type SemanticOutcomeContract} from "@workspace/application-outcomes/semantic-outcome-contract";
import { joinHistoryEvidence, matchHistoryFindings } from "./finding-evidence.js";
import { isDeepStrictEqual } from "node:util";
import { compareUtf16CodeUnits, sha256HexSyncText } from "@vibestudio/content-addressing";
import {
  blobstore,
  contextId as runtimeContext,
  memory,
  vcs,
} from "@workspace/runtime";
import type {
  Citation,
  Finding,
  Milestone,
  Report,
  Scope,
  Source,
} from "../open-personal-history/types.js";

type Input = { contextId: string; caseId: string };
type Revision = {
  label: string;
  note: string;
  indexed?: false;
  files: { path: string; text: string }[];
};
type ExpectedFinding = {
  label: string;
  status: Finding["status"];
  reads: string[];
  citations: Pick<Citation, "path" | "line" | "quote">[];
};
type World = {
  id: string;
  goal: string;
  revisions: Revision[];
  expected: {
    findings: ExpectedFinding[];
    relation: Report["relation"];
    action: Report["action"];
  };
};
type Envelope = Report;
type Operation =
  | { kind: "list"; eventId: string }
  | { kind: "read"; eventId: string; path: string };
const catalogPath = "release-catalog.json";

const citationOrder = (a: Citation, b: Citation) =>
  a.path.localeCompare(b.path) || a.line - b.line;
const bodyHash = (body: string) => sha256HexSyncText(body);
function cite(source: Source, line: number): Citation | null {
  const quote = source.text.split(/\r?\n/u)[line - 1];
  if (!quote?.trim()) return null;
  const { eventId, path, contentHash } = source;
  return { eventId, path, contentHash, line, quote };
}

export async function prepareOpenPersonalHistory(input: Input, world: World) {
  if (input.contextId !== runtimeContext || input.caseId !== world.id)
    throw new Error("Personal archive review belongs to another context");
  const namespace = crypto.randomUUID().replace(/-/gu, "");
  const query = `archive${namespace}`;
  const repoPath = `projects/archive-${namespace.slice(0, 12)}`;
  const before = await vcs.status();
  let head = before.workingHead;
  let repositoryId: string | undefined;
  const milestones: Milestone[] = [];
  async function importRevision(
    files: Revision["files"],
    message: string,
    ordinal: number,
  ) {
    const stored = await Promise.all(
      [...files]
        .sort((left, right) => compareUtf16CodeUnits(left.path, right.path))
        .map(async ({ path, text }) => ({
          path,
          contentHash: (await blobstore.putText(text)).digest,
          mode: 0o644,
        })),
    );
    const result = await vcs.importSnapshot({
      contextId: input.contextId,
      expectedWorkingHead: head,
      commandId: `history-${namespace}-${ordinal}`,
      intentSummary: message,
      source: {
        kind: "generated",
        uri: `system-test://personal-history/${namespace}`,
        snapshotRevision: bodyHash(JSON.stringify({ ordinal, stored })),
      },
      repositories: [
        { repoPath, ...(repositoryId ? { repositoryId } : {}), files: stored },
      ],
      message,
    });
    const imported = result.importedRepositoryIds[0];
    if (
      !imported ||
      result.importedRepositoryIds.length !== 1 ||
      (repositoryId && repositoryId !== imported)
    )
      throw new Error("Archive import did not preserve the owned repository");
    repositoryId = imported;
    head = { kind: "event", eventId: result.eventId };
    return result.eventId;
  }

  for (const [ordinal, revision] of world.revisions.entries()) {
    const message = `${revision.label}: ${revision.note}`;
    const eventId = await importRevision(
      revision.files,
      revision.indexed === false ? message : `${query} ${message}`,
      ordinal,
    );
    milestones.push({ label: revision.label, eventId });
  }
  const catalogText = JSON.stringify(milestones);
  const catalogEvent = await importRevision(
    [{ path: catalogPath, text: catalogText }],
    "Record the archive milestone catalog",
    milestones.length,
  );
  if (!repositoryId) throw new Error("Archive has no owned repository");
  const ownedRepository = repositoryId;
  const protectedHead = head;
  const assignedEvents = new Set(milestones.map(({ eventId }) => eventId));
  const listed = new Map<string, Set<string>>();
  const reads: Source[] = [];
  const operations: Operation[] = [];
  let discovery: Scope | undefined;

  async function read(eventId: string, path: string): Promise<Source | null> {
    const response = await vcs.readFile({
      state: { kind: "event", eventId },
      repositoryId: ownedRepository,
      file: { kind: "path", path },
    });
    if (!response) return null;
    if (
      response.repositoryId !== ownedRepository ||
      response.repoPath !== repoPath ||
      response.path !== path ||
      response.content.kind !== "text"
    )
      throw new Error(
        "Historical file read did not preserve archive coordinates",
      );
    return {
      eventId,
      path,
      contentHash: response.contentHash,
      text: response.content.text,
    };
  }

  const services = {
    archiveTimeline: {
      async discover(): Promise<Scope> {
        if (discovery) return structuredClone(discovery);
        const [catalog, recalled] = await Promise.all([
          read(catalogEvent, catalogPath),
          memory.recall({ query, kinds: ["commit"], limit: 16 }),
        ]);
        if (!catalog || catalog.text !== catalogText)
          throw new Error("Unable to read the exact committed archive catalog");
        const leads = new Map<string, Scope["leads"][number]>();
        for (const row of recalled.results) {
          if (
            row.kind === "commit" &&
            row.eventId &&
            assignedEvents.has(row.eventId) &&
            !leads.has(row.eventId)
          )
            leads.set(row.eventId, {
              eventId: row.eventId,
              snippet: row.snippet.replaceAll(query, "").trim(),
            });
        }
        discovery = {
          milestones: JSON.parse(catalog.text) as Milestone[],
          leads: [...leads.values()],
        };
        return structuredClone(discovery);
      },
      async list(eventId: string): Promise<string[]> {
        if (!assignedEvents.has(eventId))
          throw new Error(
            "List an exact milestone from the owned archive",
          );
        const manifest = await vcs.listFiles({
          state: { kind: "event", eventId },
          repositoryId: ownedRepository,
          limit: 40,
        });
        if (
          manifest.repositoryId !== ownedRepository ||
          manifest.state.kind !== "event" ||
          manifest.state.eventId !== eventId ||
          manifest.nextCursor !== null
        )
          throw new Error(
            "Archive file inventory has different coordinates or is incomplete",
          );
        const paths = manifest.files.map(({ path }) => path);
        listed.set(eventId, new Set(paths));
        operations.push({ kind: "list", eventId });
        return paths;
      },
      async read(eventId: string, path: string): Promise<Source | null> {
        if (!assignedEvents.has(eventId) || typeof path !== "string" || !path || path.startsWith("/") || path.split("/").some(part=>part===".."))
          throw new Error(
            "Read an owned archive milestone using a repository-relative path",
          );
        const source = await read(eventId, path);
        operations.push({ kind: "read", eventId, path });
        if (source) reads.push(source);
        return source ? structuredClone(source) : null;
      },
    },
  };

  async function expectedReport() {
    const findings: Finding[] = [];
    let privateEvidenceMatches = true;
    for (const expected of world.expected.findings) {
      const milestone = milestones.find(
        ({ label }) => label === expected.label,
      );
      if (!milestone)
        throw new Error(
          "Private archive expectation names an unknown milestone",
        );
      const sources = new Map(
        await Promise.all(
          expected.reads.map(
            async (path) =>
              [path, await read(milestone.eventId, path)] as const,
          ),
        ),
      );
      const revision = world.revisions.find(
        ({ label }) => label === expected.label,
      );
      privateEvidenceMatches &&= [...sources].every(([path, source]) => {
        const seeded = revision?.files.find((row) => row.path === path);
        return Boolean(source && seeded && source.text === seeded.text);
      });
      const citations: Citation[] = [];
      for (const endpoint of expected.citations) {
        const source = sources.get(endpoint.path);
        const actual = source && cite(source, endpoint.line);
        if (!actual || actual.quote !== endpoint.quote)
          privateEvidenceMatches = false;
        else citations.push(actual);
      }
      findings.push({
        label: expected.label,
        status: expected.status,
        citations: citations.sort(citationOrder),
      });
    }
    return {
      findings,
      relation: world.expected.relation,
      action: world.expected.action,
      privateEvidenceMatches,
    };
  }

  async function verify(value: unknown) {
    const envelope = value as Envelope | null;
    const report =
      envelope;
    const [after, expected] = await Promise.all([
      vcs.status(),
      expectedReport(),
    ]);
    const indexedEvents = milestones
      .flatMap(({ eventId }, index) =>
        world.revisions[index]?.indexed === false ? [] : [eventId],
      )
      .sort();
    const reportedFindings = Array.isArray(report?.findings)
      ? report.findings
      : [];
    const matchedFindings = matchHistoryFindings(expected.findings, reportedFindings);
    const checks = {
      protectedHistory:
        before.mainEventId === after.mainEventId &&
        isDeepStrictEqual(after.workingHead, protectedHead),
      observedArchiveDiscovery: Boolean(
        discovery &&
        isDeepStrictEqual(discovery.milestones, milestones) &&
        isDeepStrictEqual(
          discovery.leads.map(({ eventId }) => eventId).sort(),
          indexedEvents,
        ),
      ),
      readExactMilestones:
        expected.privateEvidenceMatches &&
        world.expected.findings.every((finding) => {
          const eventId = milestones.find(
            ({ label }) => label === finding.label,
          )?.eventId;
          return Boolean(
            eventId &&
            finding.reads.every((path) =>
              reads.some(
                (seen) => seen.eventId === eventId && seen.path === path,
              ),
            ),
          );
        }),
      joinedSourceEvidence: joinHistoryEvidence(expected.findings, reportedFindings, entry =>
        typeof entry.path === "string" && typeof entry.line === "number" && reads.some(source =>
          source.eventId === entry.eventId && source.path === entry.path &&
          isDeepStrictEqual(cite(source, entry.line), entry))),
      matchedDecision:
        matchedFindings &&
        report?.relation === expected.relation &&
        report.action === expected.action,
    };
    const contract:SemanticOutcomeContract={effects:{checks:["protectedHistory", "observedArchiveDiscovery", "readExactMilestones"],rationale:"Independent native observations, authority and persisted state establish application effects."},returnedValue:{checks:["joinedSourceEvidence", "matchedDecision"],required:true,rationale:"These are the actual requested domain findings or query values; mutation-only calls retain their separately observed effects."},incidentalValues:{checks:[],rationale:"Optional incorrect mutation returns are recorded against the actual invocation, without invalidating correct native effects."}};
    return assessSemanticOutcome({
      contextId: input.contextId,
      caseId: world.id,
      goal: world.goal,
      catalogEvent,
      repositoryId: ownedRepository,
      milestones,
      discovery,
      operations,
      expectedFindings: expected.findings,
      checks,
      passed: Object.values(checks).every(Boolean),
    },contract);
  }

  async function qualify() {
    const scope = await services.archiveTimeline.discover();
    for (const finding of world.expected.findings) {
      const event = scope.milestones.find(
        ({ label }) => label === finding.label,
      );
      if (!event)
        throw new Error("Reference could not locate the exact milestone");
      await services.archiveTimeline.list(event.eventId);
      for (const path of finding.reads)
        await services.archiveTimeline.read(event.eventId, path);
    }
    const { findings, relation, action } = await expectedReport();
    const answer: Envelope = { findings, relation, action };
    const qualified = await verify(answer);
    const forged = structuredClone(answer);
    const target = forged.findings.find(
      ({ citations }) => citations.length,
    );
    if (target?.citations[0])
      target.citations[0].contentHash = "unobserved-content";
    else forged.findings[0]!.status = "verified";
    const rejected = !(await verify(forged)).passed;
    return {
      ...qualified,
      rejectedUnboundEvidence: rejected,
      passed: qualified.passed && rejected,
    };
  }
  return { goal: world.goal, services, verify, qualify, close: async () => {} };
}
