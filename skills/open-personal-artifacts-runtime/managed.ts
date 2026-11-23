import { isDeepStrictEqual } from "node:util";
import { checkArtifactResult } from "./artifact-result.js";
import {
  browserData,
  contextId as runtimeContext,
  createPanelSlot,
  panelTree,
} from "@workspace/runtime";
import { bindBrowserLibrary } from "@workspace-skills/browser-library-runtime";
import {
  bindCollection,
  collectionSource,
} from "@workspace-skills/collection-conductor-runtime";
import type {
  ArtifactCollection,
  ArtifactCollectionEffect,
  ArtifactCollectionMutation,
  ArtifactLibrary,
  ArtifactLibraryEffect,
  ArtifactLibraryMutation,
  PersonalArtifactsReport,
} from "../open-personal-artifacts/types.js";

type Bookmark = { key: string; folder: string; title: string; path: string };
type Visit = { title: string; path: string; time: number };
type Panel = {
  key: string;
  parent: string;
  title: string;
  group?: boolean;
  note?: string;
};
type LibraryStep =
  | { kind: "save"; bookmark: Bookmark }
  | { kind: "rename"; key: string; title: string }
  | { kind: "file"; key: string; folder: string }
  | { kind: "retire"; key: string; keep: string };
type PanelStep =
  | { kind: "note"; panel: string; text: string }
  | { kind: "group"; key: string; parent: string; title: string }
  | { kind: "move"; panel: string; parent: string; after: string | null }
  | { kind: "link"; panel: string; bookmark: string; heading: string };
type Concurrent =
  | { surface: "library"; key: string; title: string }
  | { surface: "collection"; key: string; note: string };
type World = {
  id: string;
  goal: string;
  collectionTitle: string;
  folders: string[];
  bookmarks: Bookmark[];
  visits: Visit[];
  panels: Panel[];
  concurrent?: Concurrent;
  grants: { library: LibraryStep["kind"][]; collection: PanelStep["kind"][] };
  expected: {
    library: LibraryStep[];
    collection: PanelStep[];
    selected: string | null;
    libraryHeld: boolean;
    collectionHeld: boolean;
  };
};
type Input = { contextId: string; caseId: string };
type AppliedLibrary = {
  basis: string;
  mutation: ArtifactLibraryMutation;
  after: ArtifactLibrary;
};
type AppliedCollection = {
  basis: string;
  mutation: ArtifactCollectionMutation;
  after: ArtifactCollection;
};
type LinkReceipt = {
  bookmarkId: number;
  panelId: string;
  heading: string;
  url: string;
  libraryBasis: string;
};
type Envelope = {
  status: "workspace-skill-reviewed";
  skill: "personalArtifacts";
  outcome: PersonalArtifactsReport;
};
type Row = Awaited<ReturnType<typeof browserData.getBookmarks>>[number];
const rowProjection = (row: Row) => ({
  id: row.id,
  folder: row.folder_path,
  title: row.title,
  url: row.url,
});
const libraryPayload = ({
  bookmarks,
  visits,
  availableFolders,
}: ArtifactLibrary) => ({ bookmarks, visits, availableFolders });
const collectionPayload = ({
  rootId,
  complete,
  nodes,
}: ArtifactCollection) => ({ rootId, complete, nodes });
const ordered = <T extends { id: number }>(rows: T[]) =>
  rows.sort((a, b) => a.id - b.id);
const sortPaths = <T extends { url: string }>(rows: T[]) =>
  rows.sort((a, b) => a.url.localeCompare(b.url));
function sameUnordered<T>(expected: T[], actual: T[]) {
  if (expected.length !== actual.length) return false;
  const unmatched = [...actual];
  return expected.every((row) => {
    const index = unmatched.findIndex((other) => isDeepStrictEqual(row, other));
    if (index < 0) return false;
    unmatched.splice(index, 1);
    return true;
  });
}
const surface = "about/help";

export async function prepareOpenPersonalArtifacts(input: Input, world: World) {
  if (input.contextId !== runtimeContext || input.caseId !== world.id)
    throw new Error("This Personal artifact goal belongs to another context");
  const { contextId, caseId } = input;
  const namespace = crypto.randomUUID();
  const origin = `https://${namespace}.artifacts.vibestudio.invalid`;
  const folder = (suffix: string) => `/Open goal ${namespace}${suffix}`;
  const folders = world.folders.map(folder);
  const outsideFolder = folder("/Protected");
  const url = (p: string) => origin + p;
  const libraryApi = bindBrowserLibrary({ folders, origins: [origin] });
  const libraryIds = new Map<string, number>();
  const visitIds: number[] = [];
  let root: Awaited<ReturnType<typeof createPanelSlot>> | undefined;
  let outsidePanel: Awaited<ReturnType<typeof createPanelSlot>> | undefined;
  const panelIds = new Map<string, string>();
  const rawLibrary = async () =>
    (
      await Promise.all(folders.map((name) => browserData.getBookmarks(name)))
    ).flat();
  const resolveLibrary = (key: string, ids = libraryIds) => {
    const id = ids.get(key);
    if (id === undefined)
      throw new Error(`Missing browser artifact key ${key}`);
    return id;
  };
  const resolvePanel = (key: string, ids = panelIds) => {
    const id = ids.get(key);
    if (!id) throw new Error(`Missing collection artifact key ${key}`);
    return id;
  };
  let cleanup: Promise<void> | undefined;
  function close() {
    cleanup ??= (async () => {
      const steps = await Promise.allSettled([
        ...[...folders, outsideFolder].map(async (name) => {
          const rows = await browserData.getBookmarks(name);
          await Promise.all(
            rows
              .filter(({ url: value }) => value?.startsWith(origin + "/"))
              .map(({ id }) => browserData.deleteBookmark(id)),
          );
        }),
        ...visitIds.map((id) => browserData.deleteHistoryEntry(id)),
        ...(root ? [root.archive()] : []),
        ...(outsidePanel ? [outsidePanel.archive()] : []),
      ]);
      const errors = steps.flatMap((result) =>
        result.status === "rejected" ? [result.reason] : [],
      );
      if (errors.length)
        throw new AggregateError(errors, "Personal artifact cleanup failed");
    })();
    return cleanup;
  }

  try {
    for (const [index, row] of world.bookmarks.entries()) {
      libraryIds.set(
        row.key,
        await browserData.addBookmark({
          folderPath: folder(row.folder),
          title: row.title,
          url: url(row.path),
          position: index + 1,
          keyword: row.key,
          tags: "open-goal-fixture",
        }),
      );
    }
    for (const row of world.visits)
      visitIds.push(
        await browserData.recordHistoryVisit({
          url: url(row.path),
          title: row.title,
          visitTime: row.time,
        }),
      );
    const protectedId = await browserData.addBookmark({
      folderPath: outsideFolder,
      title: "Protected neighbor",
      url: url("/protected"),
    });
    const protectedRows = await browserData.getBookmarks(outsideFolder);
    if (!protectedRows.some(({ id }) => id === protectedId))
      throw new Error("Protected browser fixture could not be read");
    const initialRows = await rawLibrary();
    root = await createPanelSlot(collectionSource, {
      contextId,
      parentId: null,
      title: world.collectionTitle,
    });
    const rootId = root.id;
    panelIds.set("root", rootId);
    for (const row of world.panels) {
      const panel = await createPanelSlot(
        row.group ? collectionSource : surface,
        {
          contextId,
          parentId: resolvePanel(row.parent),
          title: row.title,
        },
      );
      panelIds.set(row.key, panel.id);
    }
    const notes = Object.fromEntries(
      world.panels.flatMap((row) =>
        row.note === undefined ? [] : [[resolvePanel(row.key), row.note]],
      ),
    );
    if (Object.keys(notes).length) await root.stateArgs.patch({ notes });
    outsidePanel = await createPanelSlot(surface, {
      contextId,
      parentId: null,
      title: "Protected panel",
    });
    const outsideId = outsidePanel.id;
    const collectionApi = bindCollection(rootId, contextId);
    const topCollection = root;
    let libraryFirst: ArtifactLibrary | undefined;
    let libraryLatest: ArtifactLibrary | undefined;
    let collectionFirst: ArtifactCollection | undefined;
    let collectionLatest: ArtifactCollection | undefined;
    const libraryObservations = new Map<string, ArtifactLibrary>();
    const collectionObservations = new Map<string, ArtifactCollection>();
    let readingLibrary: Promise<ArtifactLibrary> | undefined;
    let readingCollection: Promise<ArtifactCollection> | undefined;
    function retainLibrary(snapshot: ArtifactLibrary) {
      libraryLatest = snapshot;
      libraryObservations.set(snapshot.id, snapshot);
    }
    function retainCollection(snapshot: ArtifactCollection) {
      collectionLatest = snapshot;
      collectionObservations.set(snapshot.id, snapshot);
    }
    let competing = false;
    const refreshes: {
      surface: "library" | "collection";
      basis: string;
      current: string;
    }[] = [];
    const libraryWrites: AppliedLibrary[] = [];
    const collectionWrites: AppliedCollection[] = [];
    const links: LinkReceipt[] = [];
    let pending: Promise<unknown> | undefined;

    async function exclusive<T>(op: () => Promise<T>): Promise<T> {
      if (pending) throw new Error("Wait for the current artifact operation");
      const reads = [readingLibrary, readingCollection].filter(Boolean);
      const attempt = Promise.all(reads).then(op);
      pending = attempt;
      try {
        return await attempt;
      } finally {
        pending = undefined;
      }
    }

    async function collectionBasis(
      basis: string,
    ): Promise<ArtifactCollectionEffect> {
      const previous = collectionObservations.get(basis);
      if (!previous)
        throw new Error("Use an issued owned collection observation");
      if (!competing && world.concurrent?.surface === "collection") {
        const { key, note } = world.concurrent;
        await topCollection.stateArgs.patch({
          notes: { [resolvePanel(key)]: note },
        });
        competing = true;
      }
      const current = await collectionApi.collectionState.observe();
      if (
        !isDeepStrictEqual(
          collectionPayload(previous),
          collectionPayload(current),
        )
      ) {
        retainCollection(current);
        refreshes.push({ surface: "collection", basis, current: current.id });
        return { status: "changed", state: structuredClone(current) };
      }
      if (!current.complete)
        return { status: "held", state: structuredClone(current) };
      return { status: "applied", state: current };
    }
    async function applyCollection(
      basis: string,
      current: ArtifactCollection,
      mutation: ArtifactCollectionMutation,
    ) {
      const after = await collectionApi.collectionChange.apply(
        current.id,
        mutation,
      );
      retainCollection(after);
      collectionWrites.push({
        basis,
        mutation: structuredClone(mutation),
        after: structuredClone(after),
      });
      return { status: "applied" as const, state: structuredClone(after) };
    }
    const services = {
      artifactLibrary: {
        observe: () => {
          readingLibrary ??= (async () => {
            if (pending) await pending;
            const observed = await libraryApi.browserLibraryState.observe();
            libraryFirst ??= observed;
            retainLibrary(observed);
            return observed;
          })().finally(() => { readingLibrary = undefined; });
          return readingLibrary.then(snapshot => structuredClone(snapshot));
        },
        apply: (basis: string, mutation: ArtifactLibraryMutation) =>
          exclusive(async (): Promise<ArtifactLibraryEffect> => {
            const previous = libraryObservations.get(basis);
            if (!previous)
              throw new Error("Use an issued owned library observation");
            if (!world.grants.library.includes(mutation.kind))
              return { status: "held", state: structuredClone(previous) };
            if (!competing && world.concurrent?.surface === "library") {
              await browserData.updateBookmark(
                resolveLibrary(world.concurrent.key),
                { title: world.concurrent.title },
              );
              competing = true;
            }
            const current = await libraryApi.browserLibraryState.observe();
            if (
              !isDeepStrictEqual(
                libraryPayload(previous),
                libraryPayload(current),
              )
            ) {
              retainLibrary(current);
              refreshes.push({
                surface: "library",
                basis,
                current: current.id,
              });
              return { status: "changed", state: structuredClone(current) };
            }
            const after = await libraryApi.browserLibraryChange.apply(
              current.id,
              mutation,
            );
            retainLibrary(after);
            libraryWrites.push({
              basis,
              mutation: structuredClone(mutation),
              after: structuredClone(after),
            });
            return { status: "applied", state: structuredClone(after) };
          }),
      },
      artifactCollection: {
        observe: () => {
          readingCollection ??= (async () => {
            if (pending) await pending;
            const observed = await collectionApi.collectionState.observe();
            collectionFirst ??= observed;
            retainCollection(observed);
            return observed;
          })().finally(() => { readingCollection = undefined; });
          return readingCollection.then(snapshot => structuredClone(snapshot));
        },
        apply: (basis: string, mutation: ArtifactCollectionMutation) =>
          exclusive(async (): Promise<ArtifactCollectionEffect> => {
            const issuedCollection = collectionObservations.get(basis);
            if (!issuedCollection)
              throw new Error("Use an issued owned collection observation");
            if (!world.grants.collection.includes(mutation.kind))
              return {
                status: "held",
                state: structuredClone(collectionLatest!),
              };
            const check = await collectionBasis(basis);
            if (check.status !== "applied") return check;
            return applyCollection(basis, check.state, mutation);
          }),
        link: (
          basis: string,
          panelId: string,
          libraryBasis: string,
          bookmarkId: number,
          heading: string,
        ) =>
          exclusive(async (): Promise<ArtifactCollectionEffect> => {
            const issuedCollection = collectionObservations.get(basis);
            if (!issuedCollection)
              throw new Error("Use an issued owned collection observation");
            if (
              !world.grants.collection.includes("link") ||
              !libraryObservations.has(libraryBasis) ||
              !heading.trim() ||
              heading.length > 160 ||
              /[\r\n]/u.test(heading)
            ) {
              return {
                status: "held",
                state: structuredClone(collectionLatest!),
              };
            }
            const currentLibrary =
              await libraryApi.browserLibraryState.observe();
            const bookmark = currentLibrary.bookmarks.find(
              ({ id }) => id === bookmarkId,
            );
            if (
              !bookmark ||
              !isDeepStrictEqual(
                libraryPayload(currentLibrary),
                libraryPayload(libraryObservations.get(libraryBasis)!),
              )
            )
              return {
                status: "held",
                state: structuredClone(collectionLatest!),
              };
            const check = await collectionBasis(basis);
            if (check.status !== "applied") return check;
            const result = await applyCollection(basis, check.state, {
              kind: "note",
              panelId,
              text: `${heading}: ${bookmark.url}`,
            });
            links.push({
              panelId,
              bookmarkId,
              heading,
              url: bookmark.url,
              libraryBasis,
            });
            return result;
          }),
      },
    };

    function libraryAction(
      step: LibraryStep,
      ids = libraryIds,
    ): ArtifactLibraryMutation {
      if (step.kind === "save")
        return {
          kind: "save",
          folder: folder(step.bookmark.folder),
          title: step.bookmark.title,
          url: url(step.bookmark.path),
        };
      const id = resolveLibrary(step.key, ids);
      if (step.kind === "rename")
        return { kind: "rename", id, title: step.title };
      if (step.kind === "file")
        return { kind: "file", id, folder: folder(step.folder) };
      return { kind: "retire", id, keepId: resolveLibrary(step.keep, ids) };
    }

    function checkLibrary(actual: ArtifactLibrary) {
      const expected = initialRows.map(rowProjection);
      const ids = new Map(libraryIds);
      if (world.concurrent?.surface === "library") {
        const { key, title } = world.concurrent;
        expected.find(({ id }) => id === resolveLibrary(key))!.title = title;
      }
      for (const step of world.expected.library) {
        const desired = libraryAction(step, ids);
        if (step.kind === "save" && desired.kind === "save") {
          const added = actual.bookmarks.filter(
            ({ id, folder, title, url }) =>
              !expected.some((item) => item.id === id) &&
              folder === desired.folder &&
              title === desired.title &&
              url === desired.url,
          );
          if (added.length !== 1) return { matches: false, ids };
          expected.push(added[0]!);
          ids.set(step.bookmark.key, added[0]!.id);
        } else if (desired.kind !== "save") {
          const index = expected.findIndex(({ id }) => id === desired.id);
          if (index < 0) return { matches: false, ids };
          if (desired.kind === "rename") expected[index]!.title = desired.title;
          else if (desired.kind === "file")
            expected[index]!.folder = desired.folder;
          else if (desired.kind === "retire") expected.splice(index, 1);
        }
      }
      const expectedWrites = world.expected.library.map((step) =>
        libraryAction(step, ids),
      );
      return {
        matches:
          isDeepStrictEqual(ordered(expected), actual.bookmarks) &&
          sameUnordered(
            expectedWrites,
            libraryWrites.map(({ mutation }) => mutation),
          ),
        ids,
      };
    }

    function checkCollection(
      actual: ArtifactCollection,
      ids: Map<string, number>,
    ) {
      if (
        (collectionFirst && !collectionFirst.complete) ||
        !actual.complete ||
        actual.rootId !== rootId
      )
        return false;
      const expected = structuredClone(collectionFirst?.nodes ?? actual.nodes);
      const panels = new Map(panelIds);
      for (const row of world.panels) {
        const initial = expected.find(({ id }) => id === resolvePanel(row.key));
        if (
          initial?.parentId !== resolvePanel(row.parent) ||
          initial.title !== row.title ||
          initial.note !== (row.note ?? null) ||
          initial.source !== (row.group ? collectionSource : surface) ||
          initial.contextId !== contextId
        )
          return false;
      }
      if (expected.length !== world.panels.length + 1) return false;
      if (world.concurrent?.surface === "collection") {
        const id = resolvePanel(world.concurrent.key);
        expected.find((item) => item.id === id)!.note = world.concurrent.note;
      }
      const expectedWrites: ArtifactCollectionMutation[] = [];
      const expectedLinks: Omit<LinkReceipt, "libraryBasis">[] = [];
      for (const step of world.expected.collection) {
        if (step.kind === "group") {
          const parentId = resolvePanel(step.parent, panels);
          const added = actual.nodes.filter(
            (node) =>
              node.parentId === parentId &&
              node.title === step.title &&
              !expected.some((other) => other.id === node.id),
          );
          if (added.length !== 1) return false;
          const { id } = added[0]!;
          panels.set(step.key, id);
          expected.push({
            id,
            parentId,
            title: step.title,
            note: null,
            source: collectionSource,
            contextId,
          });
          expectedWrites.push({ kind: "group", parentId, title: step.title });
        } else {
          const panelId = resolvePanel(step.panel, panels);
          const panel = expected.find(({ id }) => id === panelId);
          if (!panel) return false;
          if (step.kind === "move") {
            panel.parentId = resolvePanel(step.parent, panels);
            const afterId = step.after
              ? resolvePanel(step.after, panels)
              : null;
            const siblings = actual.nodes.filter(
              ({ parentId }) => parentId === panel.parentId,
            );
            const index = siblings.findIndex(({ id }) => id === panelId);
            if (index < 0 || (siblings[index - 1]?.id ?? null) !== afterId)
              return false;
            expectedWrites.push({
              kind: "move",
              panelId,
              parentId: panel.parentId,
              afterId,
            });
          } else if (step.kind === "note") {
            panel.note = step.text;
            expectedWrites.push({ kind: "note", panelId, text: step.text });
          } else {
            const bookmarkId = ids.get(step.bookmark);
            const bookmark = libraryLatest?.bookmarks.find(
              ({ id }) => id === bookmarkId,
            );
            if (!bookmark || bookmarkId === undefined) return false;
            panel.note = `${step.heading}: ${bookmark.url}`;
            expectedWrites.push({ kind: "note", panelId, text: panel.note });
            expectedLinks.push({
              bookmarkId,
              panelId,
              heading: step.heading,
              url: bookmark.url,
            });
          }
        }
      }
      const actualById = new Map(actual.nodes.map((node) => [node.id, node]));
      return (
        actual.nodes.length === expected.length &&
        actualById.size === expected.length &&
        expected.every((row) =>
          isDeepStrictEqual(row, actualById.get(row.id)),
        ) &&
        sameUnordered(
          expectedWrites,
          collectionWrites.map(({ mutation }) => mutation),
        ) &&
        isDeepStrictEqual(
          expectedLinks,
          links.map(({ libraryBasis: _, ...row }) => row),
        )
      );
    }

    async function verify(value: unknown) {
      const envelope = value as Envelope | null;
      const report =
        envelope?.status === "workspace-skill-reviewed" &&
        envelope.skill === "personalArtifacts"
          ? envelope.outcome
          : null;
      const currentRows = await rawLibrary();
      const independentLibrary = await libraryApi.browserLibraryState.observe();
      const independentCollection =
        await collectionApi.collectionState.observe();
      const outside = (await panelTree.path(outsideId))?.entries.at(-1)?.node;
      const checked = checkLibrary(independentLibrary);
      const observedVisits = sortPaths(
        world.visits.map((item) => ({
          url: url(item.path),
          title: item.title,
          lastVisitTime: item.time,
        })),
      );
      const checks = {
        observedOwnedArtifacts:
          (libraryFirst ? isDeepStrictEqual(ordered(initialRows.map(rowProjection)), libraryFirst.bookmarks) &&
            isDeepStrictEqual(observedVisits, libraryFirst.visits) : libraryWrites.length === 0 && links.length === 0) &&
          (collectionFirst ? collectionFirst.rootId === rootId : collectionWrites.length === 0 && links.length === 0),
        exactLibraryState:
          checked.matches &&
          isDeepStrictEqual(
            ordered(currentRows.map(rowProjection)),
            independentLibrary.bookmarks,
          ),
        protectedBrowserRecords:
          isDeepStrictEqual(observedVisits, independentLibrary.visits) &&
          isDeepStrictEqual(
            protectedRows,
            await browserData.getBookmarks(outsideFolder),
          ) &&
          currentRows.every((row) => {
            const before = initialRows.find(({ id }) => id === row.id);
            return (
              !before ||
              (row.keyword === before.keyword &&
                row.tags === before.tags &&
                row.position === before.position &&
                row.date_added === before.date_added)
            );
          }),
        exactCollectionState:
          checkCollection(independentCollection, checked.ids) &&
          outside?.slotId === outsideId &&
          outside.title === "Protected panel",
        verifiedBookmarkHandoff:
          links.length ===
            world.expected.collection.filter((step) => step.kind === "link")
              .length &&
          links.every(
            (link) =>
              independentLibrary.bookmarks.some(
                ({ id, url }) => id === link.bookmarkId && url === link.url,
              ) &&
              independentCollection.nodes.some(
                ({ id, note }) =>
                  id === link.panelId &&
                  note === `${link.heading}: ${link.url}`,
              ),
          ),
        recoveredFreshBasis: world.concurrent
          ? competing &&
            refreshes.length > 0 &&
            refreshes.every(refresh => refresh.surface === world.concurrent!.surface && refresh.basis !== refresh.current) &&
            (world.concurrent.surface === "library"
              ? libraryWrites
              : collectionWrites
            ).some(({ basis }) => basis !== refreshes[0]?.basis)
          : !competing && refreshes.length === 0,
        reportedArtifactEvidence: checkArtifactResult(report, {
          goal: world.goal, library: independentLibrary, collection: independentCollection,
          libraryObservations, collectionObservations,
          libraryChanged: libraryWrites.length > 0, collectionChanged: collectionWrites.length > 0,
          libraryHeld: world.expected.libraryHeld, collectionHeld: world.expected.collectionHeld,
          selected: world.expected.selected ? checked.ids.get(world.expected.selected) ?? null : null,
        }),
      };
      return {
        caseId,
        contextId,
        goal: world.goal,
        libraryFirst,
        collectionFirst,
        independentLibrary,
        independentCollection,
        libraryWrites,
        collectionWrites,
        links,
        refreshes,
        checks,
        passed: Object.values(checks).every((value) => value === true),
      };
    }

    async function qualify() {
      let library = await services.artifactLibrary.observe();
      const ids = new Map(libraryIds);
      for (const step of world.expected.library) {
        const mutation = libraryAction(step, ids);
        let result = await services.artifactLibrary.apply(library.id, mutation);
        if (result.status === "changed")
          result = await services.artifactLibrary.apply(
            result.state.id,
            mutation,
          );
        if (result.status !== "applied")
          throw new Error("Reference library change was held");
        library = result.state;
        if (step.kind === "save") {
          const row = library.bookmarks.find(
            ({ url: value, folder: destination, title }) =>
              value === url(step.bookmark.path) &&
              destination === folder(step.bookmark.folder) &&
              title === step.bookmark.title,
          );
          if (!row) throw new Error("Reference bookmark was not observed");
          ids.set(step.bookmark.key, row.id);
        }
      }
      let collection = await services.artifactCollection.observe();
      const panels = new Map(panelIds);
      for (const step of world.expected.collection) {
        const run = (basis: string) => {
          if (step.kind === "link")
            return services.artifactCollection.link(
              basis,
              resolvePanel(step.panel, panels),
              library.id,
              resolveLibrary(step.bookmark, ids),
              step.heading,
            );
          if (step.kind === "group")
            return services.artifactCollection.apply(basis, {
              kind: "group",
              parentId: resolvePanel(step.parent, panels),
              title: step.title,
            });
          const panelId = resolvePanel(step.panel, panels);
          return services.artifactCollection.apply(
            basis,
            step.kind === "note"
              ? { kind: "note", panelId, text: step.text }
              : {
                  kind: "move",
                  panelId,
                  parentId: resolvePanel(step.parent, panels),
                  afterId: step.after ? resolvePanel(step.after, panels) : null,
                },
          );
        };
        let result = await run(collection.id);
        if (result.status === "changed") result = await run(result.state.id);
        if (result.status !== "applied")
          throw new Error("Reference collection change was held");
        collection = result.state;
        if (step.kind === "group") {
          const added = collection.nodes.find(
            (node) =>
              node.title === step.title &&
              node.parentId === resolvePanel(step.parent, panels),
          );
          if (!added)
            throw new Error("Reference collection group was not observed");
          panels.set(step.key, added.id);
        }
      }
      const report: Envelope = {
        status: "workspace-skill-reviewed",
        skill: "personalArtifacts",
        outcome: (() => {
          const holds = world.expected.libraryHeld ? (library.visits.length ? [{
            kind: "tied-latest-visits" as const, basis: library, reference: library.visits[0]!.title.split(" ").filter(word=>library.visits.every(row=>row.title.includes(word))).join(" "),
            urls: library.visits.filter(row=>row.lastVisitTime===Math.max(...library.visits.map(row=>row.lastVisitTime))).map(row=>row.url),
          }] : [{ kind: "different-urls" as const, basis: library,
            leftId: library.bookmarks[0]!.id, rightId: library.bookmarks[1]!.id }]) : [];
          if (!libraryWrites.length && !collectionWrites.length && holds.length) return {kind:"held" as const, holds};
          return {kind: libraryWrites.length || collectionWrites.length ? "changed" as const : "unchanged" as const,
            library: {state:library,held:world.expected.libraryHeld,bookmarkId:world.expected.selected ? resolveLibrary(world.expected.selected,ids) : null},
            collection:{state:collection,held:world.expected.collectionHeld},holds};
        })(),
      };
      const verified = await verify(report);
      const forged = await verify({
        ...report,
        outcome: {kind:"held", holds:[{kind:"different-urls", basis:{...library,id:"unauthenticated-observation"},leftId:0,rightId:1}]},
      });
      return {
        ...verified,
        rejectedForgedEvidence: !forged.checks.reportedArtifactEvidence,
        passed: verified.passed && !forged.checks.reportedArtifactEvidence,
      };
    }

    return { goal: world.goal, services, verify, qualify, close };
  } catch (error) {
    await close();
    throw error;
  }
}
