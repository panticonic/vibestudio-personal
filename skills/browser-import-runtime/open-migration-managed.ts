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
  let observed = false;
  let choice: MigrationChoice | undefined;
  let bound: ImportRun | undefined;
  let view: MigrationHandoffView | undefined;
  let basis: string | undefined;
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

  let handoffReview: BrowserImportReviewReport | undefined;
  const openBrowserMigration = {
    async discover() {
      observed = true;
      return record("discover", [], catalog);
    },
    async bind(revision: string, candidate: MigrationChoice) {
      const run = active.get(candidate?.sourceId);
      const profile = profiles.get(candidate?.sourceId)?.profile;
      if (
        !observed ||
        revision !== catalog.revision ||
        bound ||
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
        delivery ||
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
      basis = snapshot.id;
      handoffReview = structuredClone(review);
      view = {
        receiptId: evidence.id,
        revision: fingerprint([evidence, snapshot.id]),
        bookmarks: evidence.bookmarks,
        targets,
      };
      return record("inspectHandoff", [review], view);
    },
    async stageHandoff(revision: string, candidate: MigrationHandoffChoice) {
      if (
        !collection ||
        !view ||
        !basis ||
        !handoffReview ||
        writing ||
        delivery ||
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
        const current = await retained(handoffReview);
        if (!current || fingerprint([current, basis]) !== revision)
          return record("stageHandoff", [revision, candidate], null);
        const note = `${candidate.bookmark.title}: ${candidate.bookmark.url}`;
        const after = await collection.collectionChange.apply(basis, {
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

  type Wrapper = {
    status: string;
    skill: string;
    outcome: OpenMigrationReport;
  };
  async function verify(wrapper: Wrapper | null) {
    const outcome =
      wrapper?.status === "workspace-skill-reviewed" &&
      wrapper.skill === world.kind &&
      wrapper.outcome?.status &&
      wrapper.outcome.status !== "unresolved"
        ? wrapper.outcome
        : null;
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
      discoveredMigrationSources:
        journal.filter(({ method }) => method === "discover").length > 0,
      boundExactMigration:
        selected?.passed === true &&
        choice?.sourceId === world.expected.source &&
        isDeepStrictEqual(outcome?.choice, choice) &&
        journal.filter(({ method }) => method === "bind").length === 1 &&
        journal.filter(({ method }) => method === "readOutcome").length > 0 &&
        isDeepStrictEqual(outcome?.evidence, recordedOutcome),
      preservedOtherProfiles: unchangedOthers.every(Boolean),
      matchedMigrationDisposition: outcome?.status === world.expected.status,
      verifiedRetainedHandoff:
        journal.filter(({ method }) => method === "inspectHandoff").length ===
          (expectedHandoff || world.expected.missingHandoff ? 1 : 0) &&
        journal.filter(({ method }) => method === "stageHandoff").length ===
          (expectedHandoff ? 1 : 0) &&
        (expectedHandoff
          ? Boolean(
              expectedTarget &&
              delivery &&
              delivery.receiptId === evidence?.id &&
              delivery.targetId === expectedTarget &&
              isDeepStrictEqual(delivery.bookmark, expectedHandoff.bookmark) &&
              delivery.note === expectedNote &&
              isDeepStrictEqual(outcome?.delivery, delivery),
            )
          : delivery === null && outcome?.delivery === null),
      preservedCollectionNeighbors:
        Boolean(after?.complete) === Boolean(baseline) &&
        isDeepStrictEqual(after?.nodes, expectedNodes),
    };
    return {
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
    };
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
      choice: candidate,
      review: report,
      evidence,
      delivery: receipt,
    };
    const wrapper = {
      status: "workspace-skill-reviewed",
      skill: world.kind,
      outcome,
    };
    const positive = await verify(wrapper);
    const negative = await verify({
      ...wrapper,
      outcome: {
        ...outcome,
        status: "held",
        choice: { ...candidate, sourceId: "foreign-profile" },
      },
    });
    const aliases = await verify({
      ...wrapper,
      outcome: {
        ...outcome,
        ...(receipt
          ? { delivery: { ...receipt, targetId: "foreign-panel" } }
          : { choice: { ...candidate, categories: [] } }),
      },
    });
    return {
      ...positive,
      checks: {
        ...positive.checks,
        rejectsWrongDisposition: !negative.passed,
        rejectsAlias: !aliases.passed,
      },
      passed: positive.passed && !negative.passed && !aliases.passed,
    };
  }

  return { services, verify, qualify };
}
