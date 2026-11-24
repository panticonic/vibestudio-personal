import {assessObservedApplicationOutcome} from "@workspace/application-outcomes/observed-application-outcome";
import type {InvocationObservations} from "@workspace/application-outcomes/observed-invocation";
import type {SemanticOutcomeContract} from "@workspace/application-outcomes/semantic-outcome-contract";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { contextId, createPanelSlot } from "@workspace/runtime";
import {
  bindCollection,
  collectionSource,
} from "@workspace-skills/collection-conductor-runtime";
import type {
  BrowserImportReviewReport,
  MigrationBookmark,
  MigrationCatalog,
  MigrationChoice,
  MigrationDelivery,
  MigrationHandoffChoice,
  MigrationHandoffView,
  MigrationProfile,
  OpenMigrationReport,
} from "../browser-import-review/types.js";
import {
  prepareManagedBrowserImport,
  type ManagedBrowserImportWorld,
} from "./managed.js";

type Profile = {
  profile: MigrationProfile;
  import: ManagedBrowserImportWorld;
  loseOwnershipBeforeStart?: boolean;
  retainedBookmarks?: MigrationBookmark[];
};

export type OpenBrowserMigrationWorld = {
  kind: "browserMigration";
  id: string;
  goal: string;
  workspace: "personal";
  sourceGroup: string;
  split?: "test";
  profiles: Profile[];
  collection?: {
    title: string;
    panels: { title: string; parent: string; note: string }[];
  };
  expected: {
    source: string;
    status: Exclude<OpenMigrationReport["status"], "unresolved">;
    handoff?: { title: string; parent: string; bookmark: MigrationBookmark };
    missingHandoff?: boolean;
  };
};

type ImportRun = Awaited<ReturnType<typeof prepareManagedBrowserImport>>;
const fingerprint = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

export async function prepareOpenBrowserMigration(
  world: OpenBrowserMigrationWorld,
) {
  if (!contextId) throw new Error("An owned migration context is required");
  const owner = contextId;
  const profiles = new Map(world.profiles.map((row) => [row.profile.id, row]));
  if (profiles.size !== world.profiles.length)
    throw new Error("Migration source IDs must be unique");
  const active = new Map<string, ImportRun>();
  for (const [id, profile] of profiles) {
    active.set(
      id,
      await prepareManagedBrowserImport(
        { ...profile.import, goal: world.goal },
        {
          hostId: profile.profile.device,
          sourceId: id,
          retainedBookmarks: profile.retainedBookmarks,
          loseOwnershipBeforeStart: profile.loseOwnershipBeforeStart,
        },
      ),
    );
  }
  const initial = new Map(
    await Promise.all(
      [...active].map(
        async ([id, run]) => [id, await run.readEvidence()] as const,
      ),
    ),
  );

  const root =
    world.collection &&
    (await createPanelSlot(collectionSource, {
      title: world.collection.title,
      contextId: owner,
      parentId: null,
    }));
  const panelIds = new Map<string, string>();
  if (root && world.collection) {
    const groups = new Map<string, string>();
    const notes: Record<string, string> = {};
    for (const panel of world.collection.panels) {
      let parentId = groups.get(panel.parent);
      if (!parentId) {
        const group = await createPanelSlot(collectionSource, {
          title: panel.parent,
          contextId: owner,
          parentId: root.id,
        });
        parentId = group.id;
        groups.set(panel.parent, parentId);
      }
      const leaf = await createPanelSlot("about/help", {
        title: panel.title,
        contextId: owner,
        parentId,
      });
      panelIds.set(JSON.stringify([panel.parent, panel.title]), leaf.id);
      notes[leaf.id] = panel.note;
    }
    await root.stateArgs.patch({ notes });
  }
  const collection = root && bindCollection(root.id, owner);
  const baseline = collection
    ? await collection.collectionState.observe()
    : null;
  const catalog: MigrationCatalog = {
    revision: fingerprint([...profiles.values()].map(({ profile }) => profile)),
    profiles: [...profiles.values()].map(({ profile }) => profile),
    collection: world.collection?.title ?? null,
  };
  const journal: { method: string; args: unknown[]; result: unknown }[] = [];
  const record = <T>(method: string, args: unknown[], result: T) => {
    journal.push(structuredClone({ method, args, result }));
    return structuredClone(result);
  };
  let choice: MigrationChoice | undefined;
  let bound: ImportRun | undefined;
  const issuedViews = new Map<string, { view: MigrationHandoffView; basis: string; nodes: NonNullable<typeof baseline>["nodes"]; review: BrowserImportReviewReport }>();
  let delivery: MigrationDelivery | null = null;
  let writing = false;

  async function retained(review: BrowserImportReviewReport) {
    const evidence = await bound?.readEvidence();
    const receipt = evidence?.receipt;
    if (
      !choice ||
      review.next !== "keep-results" ||
      !evidence ||
      !receipt ||
      !["complete", "cancelled", "partial"].includes(receipt.phase) ||
      receipt.hostId !== evidence.hostId ||
      receipt.sourceId !== choice.sourceId ||
      !isDeepStrictEqual(receipt.requestedDataTypes, choice.categories) ||
      !isDeepStrictEqual(
        review.progress,
        receipt.progress.map(({ dataType, stored, skipped, errors }) => ({
          category: dataType,
          stored,
          skipped,
          errors,
        })),
      )
    )
      return null;
    return {
      ...evidence,
      bookmarks: evidence.bookmarks.flatMap(({ title, url }) =>
        url ? [{ title, url }] : [],
      ),
    };
  }

  const openBrowserMigration = {
    async discover() {
      return record("discover", [], catalog);
    },
    async bind(revision: string, candidate: MigrationChoice) {
      const run = active.get(candidate?.sourceId);
      const profile = profiles.get(candidate?.sourceId)?.profile;
      if (
        revision !== catalog.revision ||
        (bound && (bound !== run || !isDeepStrictEqual(choice, candidate))) ||
        !run ||
        !profile ||
        candidate.operation !== run.request.kind ||
        !isDeepStrictEqual(candidate.categories, run.request.categories) ||
        (candidate.operation === "execute" &&
          !candidate.categories.every((category) =>
            profile.approved.includes(category),
          ))
      ) {
        return record("bind", [revision, candidate], null);
      }
      bound = run;
      choice = structuredClone(candidate);
      return record("bind", [revision, candidate], run.request);
    },
    async readOutcome() {
      if (!bound) throw new Error("No browser import was bound");
      return record("readOutcome", [], await bound.readOutcome());
    },
    async inspectHandoff(review: BrowserImportReviewReport) {
      const evidence = await retained(review);
      if (
        !collection ||
        !evidence ||
        !evidence.bookmarks.length ||
        writing
      )
        return record("inspectHandoff", [review], null);
      const snapshot = await collection.collectionState.observe();
      if (!snapshot.complete) return record("inspectHandoff", [review], null);
      const targets = snapshot.nodes
        .filter(({ id }) => [...panelIds.values()].includes(id))
        .map((node) => ({
          id: node.id,
          title: node.title,
          parent:
            snapshot.nodes.find(({ id }) => id === node.parentId)?.title ??
            null,
        }));
      const view: MigrationHandoffView = {
        receiptId: evidence.id,
        revision: fingerprint([evidence, snapshot.id]),
        bookmarks: evidence.bookmarks,
        targets,
      };
      issuedViews.set(view.revision, { view: structuredClone(view), basis: snapshot.id, nodes: structuredClone(snapshot.nodes), review: structuredClone(review) });
      return record("inspectHandoff", [review], view);
    },
    async stageHandoff(revision: string, candidate: MigrationHandoffChoice) {
      const issued = issuedViews.get(revision);
      const view = issued?.view;
      if (
        !collection ||
        !view ||
        !issued ||
        writing ||
        revision !== view.revision ||
        !view.targets.some(({ id }) => id === candidate?.targetId) ||
        !view.bookmarks.some((bookmark) =>
          isDeepStrictEqual(bookmark, candidate?.bookmark),
        )
      ) {
        return record("stageHandoff", [revision, candidate], null);
      }
      writing = true;
      try {
        const current = await retained(issued.review);
        if (!current || fingerprint([current, issued.basis]) !== revision)
          return record("stageHandoff", [revision, candidate], null);
        const note = `${candidate.bookmark.title}: ${candidate.bookmark.url}`;
        if (delivery) {
          const now = await collection.collectionState.observe();
          const expectedNodes = issued.nodes.map(node => node.id === delivery!.targetId ? { ...node, note: delivery!.note } : node);
          return record("stageHandoff", [revision, candidate], delivery.targetId === candidate.targetId &&
            isDeepStrictEqual(delivery.bookmark, candidate.bookmark) && now.complete && isDeepStrictEqual(now.nodes, expectedNodes)
            ? delivery : null);
        }
        const after = await collection.collectionChange.apply(issued.basis, {
          kind: "note",
          panelId: candidate.targetId,
          text: note,
        });
        if (
          !after.complete ||
          !after.nodes.some(
            ({ id, note: value }) =>
              id === candidate.targetId && value === note,
          )
        )
          throw new Error("The migration handoff could not be read back");
        delivery = {
          receiptId: current.id,
          targetId: candidate.targetId,
          bookmark: candidate.bookmark,
          note,
        };
        return record("stageHandoff", [revision, candidate], delivery);
      } finally {
        writing = false;
      }
    },
  };

  const requireBound = () => {
    if (!bound)
      throw new Error("Discover and bind an owned browser profile first");
    return bound.services;
  };
  const services = {
    openBrowserMigration,
    browserImportSource: {
      observe: () => requireBound().browserImportSource.observe(),
    },
    browserImportPreview: {
      observe: () => requireBound().browserImportPreview.observe(),
    },
    browserImportHistory: {
      observe: () => requireBound().browserImportHistory.observe(),
    },
    browserImportStart: {
      start: (
        preview: Parameters<
          NonNullable<ImportRun["services"]["browserImportStart"]>["start"]
        >[0],
      ) =>
        requireBound().browserImportStart?.start(preview) ??
        Promise.resolve("held" as const),
    },
  };

  type Wrapper = OpenMigrationReport;
  async function verify(wrapper: Wrapper | null,invocation?:InvocationObservations) {
    const outcome = wrapper?.status && wrapper.status !== "unresolved" ? wrapper : null;
    const selected = await bound?.verify(outcome?.review ?? null);
    const evidence = await bound?.readEvidence();
    const recordedOutcome = await bound?.readOutcome();
    const after = root
      ? await bindCollection(root.id, owner).collectionState.observe()
      : null;
    const expectedHandoff = world.expected.handoff;
    const expectedTarget =
      expectedHandoff &&
      panelIds.get(
        JSON.stringify([expectedHandoff.parent, expectedHandoff.title]),
      );
    const expectedNote =
      expectedHandoff &&
      `${expectedHandoff.bookmark.title}: ${expectedHandoff.bookmark.url}`;
    const expectedNodes = baseline?.nodes.map((node) =>
      node.id === expectedTarget ? { ...node, note: expectedNote } : node,
    );
    const unchangedOthers = await Promise.all(
      [...active]
        .filter(([id]) => id !== choice?.sourceId)
        .map(async ([id, run]) =>
          isDeepStrictEqual(await run.readEvidence(), initial.get(id)),
        ),
    );
    const checks = {
      returnedMigrationDelivery:isDeepStrictEqual(outcome?.delivery,delivery),
      discoveredMigrationSources: !!choice && active.has(choice.sourceId),
      boundExactMigration:
        selected?.passed === true && choice?.sourceId === world.expected.source &&
        outcome?.receiptId===recordedOutcome?.receiptId && outcome?.phase===recordedOutcome?.phase &&
        isDeepStrictEqual(outcome?.bookmarks,recordedOutcome?.retainedBookmarks),
      preservedOtherProfiles: unchangedOthers.every(Boolean),
      matchedMigrationDisposition: outcome?.status === world.expected.status,
      verifiedRetainedHandoff:
        (expectedHandoff
          ? Boolean(
              expectedTarget &&
              delivery &&
              delivery.receiptId === evidence?.id &&
              delivery.targetId === expectedTarget &&
              isDeepStrictEqual(delivery.bookmark, expectedHandoff.bookmark) &&
              delivery.note === expectedNote,
            )
          : delivery === null),
      preservedCollectionNeighbors:
        Boolean(after?.complete) === Boolean(baseline) &&
        isDeepStrictEqual(after?.nodes, expectedNodes),
    };
    const contract:SemanticOutcomeContract={effects:{checks:["discoveredMigrationSources", "preservedOtherProfiles", "verifiedRetainedHandoff", "preservedCollectionNeighbors"],rationale:"Independent native observations, authority and persisted state establish application effects."},returnedValue:{checks:["boundExactMigration", "matchedMigrationDisposition"],required:true,rationale:"These are the actual requested domain findings or query values; mutation-only calls retain their separately observed effects."},incidentalValues:{checks:["returnedMigrationDelivery"],rationale:"Optional incorrect mutation returns are recorded against the actual invocation, without invalidating correct native effects."}};

    const assessed=await assessObservedApplicationOutcome({
      caseId: world.id,
      goal: world.goal,
      contextId: owner,
      checks,
      catalog,
      journal,
      selected,
      evidence,
      delivery,
      after,
      passed: Object.values(checks).every(Boolean),
    },contract,wrapper,invocation,[]);
    const {observedChecks,...dimensions}=assessed;
    return {...dimensions,checks:observedChecks};
  }

  async function qualify() {
    const { revision } = await openBrowserMigration.discover();
    const sourceId = world.expected.source;
    const run = active.get(sourceId)!;
    const candidate = {
      sourceId,
      operation: run.request.kind,
      categories: run.request.categories,
    };
    if (!(await openBrowserMigration.bind(revision, candidate)))
      throw new Error("Reference migration failed to bind");
    const { report } = await run.qualify();
    const evidence = await openBrowserMigration.readOutcome();
    let receipt = null;
    const handoffView =
      world.expected.handoff || world.expected.missingHandoff
        ? await openBrowserMigration.inspectHandoff(report)
        : null;
    if (world.expected.missingHandoff && !handoffView)
      throw new Error("Reference retained alternatives are unavailable");
    if (world.expected.handoff) {
      const { parent, title, bookmark } = world.expected.handoff;
      const view = handoffView;
      const target = view?.targets.find(
        (row) => row.title === title && row.parent === parent,
      );
      if (!view || !target)
        throw new Error("Reference handoff target is unavailable");
      receipt = await openBrowserMigration.stageHandoff(view.revision, {
        bookmark,
        targetId: target.id,
      });
    }
    const outcome: OpenMigrationReport = {
      status: world.expected.status,
      review: report,
      receiptId:evidence.receiptId,phase:evidence.phase,bookmarks:evidence.retainedBookmarks,
      delivery: receipt,
    };
    const wrapper = outcome;
    const positive = await verify(wrapper);
    const negative = await verify({
        ...outcome,
        status: "held",
        receiptId:"foreign-receipt",
      });
    const aliases = await verify({
        ...outcome,
        receiptId: "foreign-receipt",
        ...(receipt ? { delivery: { ...receipt, targetId: "foreign-panel" } } : {}),
      });
    return {
      outcomeContract:{...positive.outcomeContract,effects:{...positive.outcomeContract.effects,checks:[...positive.outcomeContract.effects.checks,"rejectsWrongDisposition","rejectsAlias"]}},
      ...positive,
      checks: {
        ...positive.checks,
        rejectsWrongDisposition: !negative.outcomeDimensions.returnedValue.passed,
        rejectsAlias: !aliases.outcomeDimensions.returnedValue.passed,
      },
      passed: positive.passed && !negative.outcomeDimensions.returnedValue.passed && !aliases.outcomeDimensions.returnedValue.passed,
    };
  }

  return { services, verify, qualify };
}
