import { isDeepStrictEqual } from "node:util";
import { browserData } from "@workspace/runtime";
import type {
  BookmarkRef,
  BrowserLibraryReport,
  BrowserLibraryRequest,
  BrowserLibrarySnapshot,
  LibraryFinding,
  LibraryMutation,
} from "../browser-library/types.js";
import { bindBrowserLibrary } from "./index.js";

type Outcome =
  | { kind: "held" }
  | { kind: "save"; key: string; url: string; title: string }
  | { kind: "rename" | "file"; key: string }
  | { kind: "retire"; key: string; keep: string };

type Seed = {
  folders: readonly string[];
  origin: string;
  bookmarks: readonly {
    key: string;
    folder: string;
    url: string;
    title: string;
  }[];
  visits: readonly { url: string; title: string; time: number }[];
};
type World = {
  id: string;
  request: BrowserLibraryRequest;
  expected: readonly Outcome[];
};

export async function prepareManagedBrowserLibrary(
  contextId: string,
  world: World,
  seed: Seed,
) {
  const namespace = crypto.randomUUID();
  const origin = `https://${namespace}.library.vibestudio.invalid`;
  const resolveUrl = (url: string) => url.replace(seed.origin, origin);
  const resolveFolder = (folder: string) =>
    `/System test ${namespace}${folder}`;
  const folders = seed.folders.map(resolveFolder);
  const otherFolder = resolveFolder("/Outside");
  const initial = new Map<string, number>();
  const visits: number[] = [];
  const runtime = bindBrowserLibrary({ folders, origins: [origin] });
  let baseline: BrowserLibrarySnapshot | undefined;
  const transitions: {
    mutation: LibraryMutation;
    after: BrowserLibrarySnapshot;
  }[] = [];
  const readRows = async () =>
    (
      await Promise.all(
        folders.map((folder) => browserData.getBookmarks(folder)),
      )
    ).flat();

  async function close() {
    const rows = [
      ...(await readRows()),
      ...(await browserData.getBookmarks(otherFolder)),
    ];
    for (const { id, url } of rows) {
      if (url?.startsWith(origin + "/")) await browserData.deleteBookmark(id);
    }
    for (const id of visits) await browserData.deleteHistoryEntry(id);
  }

  const resolveRef = (ref: BookmarkRef): BookmarkRef => ({
    ...ref,
    folder: resolveFolder(ref.folder),
    ...(ref.url !== undefined ? { url: resolveUrl(ref.url) } : {}),
  });
  const request: BrowserLibraryRequest = {
    goal: world.request.goal,
    actions: world.request.actions.map((action) => {
      switch (action.kind) {
        case "recover":
          return {
            ...action,
            query: resolveUrl(action.query),
            folder: resolveFolder(action.folder),
          };
        case "file":
          return {
            ...action,
            target: resolveRef(action.target),
            folder: resolveFolder(action.folder),
          };
        case "rename":
          return { ...action, target: resolveRef(action.target) };
        case "retire":
          return {
            ...action,
            target: resolveRef(action.target),
            keep: resolveRef(action.keep),
          };
      }
    }),
  };

  let outside: number;
  let stored: Awaited<ReturnType<typeof readRows>>;
  try {
    for (const [index, row] of seed.bookmarks.entries()) {
      const id = await browserData.addBookmark({
        folderPath: resolveFolder(row.folder),
        url: resolveUrl(row.url),
        title: row.title,
        position: index + 1,
        tags: "system-test",
        keyword: row.key,
      });
      initial.set(row.key, id);
    }
    for (const row of seed.visits) {
      visits.push(
        await browserData.recordHistoryVisit({
          url: resolveUrl(row.url),
          title: row.title,
          visitTime: row.time,
        }),
      );
    }
    outside = await browserData.addBookmark({
      title: "Outside the assigned folders",
      folderPath: otherFolder,
      url: resolveUrl(seed.bookmarks[0]!.url),
    });
    stored = await readRows();
  } catch (error) {
    await close();
    throw error;
  }

  const services = {
    browserLibraryState: {
      async observe() {
        if (baseline)
          throw new Error("This scenario has one starting observation");
        baseline = await runtime.browserLibraryState.observe();
        return structuredClone(baseline);
      },
    },
    browserLibraryChange: {
      async apply(id: string, mutation: LibraryMutation) {
        const after = await runtime.browserLibraryChange.apply(id, mutation);
        transitions.push({
          mutation: structuredClone(mutation),
          after: structuredClone(after),
        });
        return after;
      },
    },
  };

  function changeAt(
    index: number,
    ids: Map<string, number>,
  ): LibraryMutation | null {
    const plan = world.expected[index]!;
    const action = request.actions[index]!;
    const idFor = (key: string) => {
      const id = ids.get(key);
      if (id === undefined)
        throw new Error(`Missing browser-library key ${key}`);
      return id;
    };
    if (plan.kind === "held") return null;
    if (plan.kind === "save" && action.kind === "recover") {
      return {
        kind: "save",
        folder: action.folder,
        url: resolveUrl(plan.url),
        title: plan.title,
      };
    }
    if (plan.kind === "rename" && action.kind === "rename") {
      return { kind: "rename", id: idFor(plan.key), title: action.title };
    }
    if (plan.kind === "file" && action.kind === "file") {
      return { kind: "file", id: idFor(plan.key), folder: action.folder };
    }
    if (plan.kind === "retire" && action.kind === "retire") {
      return { kind: "retire", id: idFor(plan.key), keepId: idFor(plan.keep) };
    }
    throw new Error("Inconsistent browser-library world");
  }

  function checkEffect(
    before: BrowserLibrarySnapshot,
    after: BrowserLibrarySnapshot,
    change: LibraryMutation,
  ) {
    if (
      before.id === after.id ||
      !isDeepStrictEqual(before.visits, after.visits)
    )
      return null;
    const rows = structuredClone(before.bookmarks);
    let id: number;
    if (change.kind === "save") {
      const added = after.bookmarks.filter(
        (row) => !rows.some((old) => old.id === row.id),
      );
      if (added.length !== 1) return null;
      id = added[0]!.id;
      rows.push({
        id,
        title: change.title,
        folder: change.folder,
        url: change.url,
      });
    } else {
      const index = rows.findIndex(({ id: rowId }) => rowId === change.id);
      if (index < 0) return null;
      if (change.kind === "retire") {
        id = change.keepId;
        rows.splice(index, 1);
      } else {
        id = change.id;
        if (change.kind === "rename") rows[index]!.title = change.title;
        else rows[index]!.folder = change.folder;
      }
    }
    return isDeepStrictEqual(
      rows.sort((a, b) => a.id - b.id),
      after.bookmarks,
    )
      ? id
      : null;
  }

  const held = (before: BrowserLibrarySnapshot): LibraryFinding => ({
    status: "held",
    bookmarkId: null,
    evidence: [before.id],
  });
  const proven = (
    before: BrowserLibrarySnapshot,
    after: BrowserLibrarySnapshot,
    id: number,
  ): LibraryFinding => ({
    status: "verified",
    bookmarkId: id,
    evidence: [before.id, after.id],
  });

  async function reference(): Promise<BrowserLibraryReport> {
    const ids = new Map(initial);
    let before = await services.browserLibraryState.observe();
    const findings: LibraryFinding[] = [];
    for (const [index, plan] of world.expected.entries()) {
      const change = changeAt(index, ids);
      if (!change) {
        findings.push(held(before));
        continue;
      }
      const after = await services.browserLibraryChange.apply(
        before.id,
        change,
      );
      const id = checkEffect(before, after, change);
      if (id === null)
        throw new Error(`Browser-library effect failed at action ${index + 1}`);
      if (plan.kind === "save") ids.set(plan.key, id);
      findings.push(proven(before, after, id));
      before = after;
    }
    return { findings };
  }

  async function verify(report: BrowserLibraryReport | null) {
    const ids = new Map(initial);
    const expectedFindings: LibraryFinding[] = [];
    let transitionIndex = 0;
    let before = baseline;
    const exactEffects =
      !!before &&
      world.expected.every((plan, index) => {
        if (!before) return false;
        const change = changeAt(index, ids);
        if (!change) {
          expectedFindings.push(held(before));
          return true;
        }
        const receipt = transitions[transitionIndex++];
        if (!receipt || !isDeepStrictEqual(change, receipt.mutation))
          return false;
        const id = checkEffect(before, receipt.after, change);
        if (id === null) return false;
        if (plan.kind === "save") ids.set(plan.key, id);
        expectedFindings.push(proven(before, receipt.after, id));
        before = receipt.after;
        return true;
      }) &&
      transitionIndex === transitions.length;
    const currentRows = await readRows();
    const checks = {
      initial:
        baseline?.bookmarks.length === seed.bookmarks.length &&
        baseline.visits.length === seed.visits.length &&
        seed.bookmarks.every((row) =>
          baseline!.bookmarks.some(
            (seen) =>
              seen.id === initial.get(row.key) &&
              seen.folder === resolveFolder(row.folder) &&
              seen.title === row.title &&
              seen.url === resolveUrl(row.url),
          ),
        ) &&
        seed.visits.every((row) =>
          baseline!.visits.some(
            (seen) =>
              seen.url === resolveUrl(row.url) &&
              seen.title === row.title &&
              seen.lastVisitTime === row.time,
          ),
        ),
      exactEffects: exactEffects && isDeepStrictEqual(
        currentRows
          .map((row) => ({ id: row.id, title: row.title, folder: row.folder_path, url: row.url }))
          .sort((a, b) => a.id - b.id),
        before?.bookmarks,
      ),
      report: isDeepStrictEqual(report?.findings, expectedFindings),
      metadata: currentRows.every((row) => {
        const start = stored.find(({ id }) => id === row.id);
        return (
          !start ||
          (start.position === row.position &&
            start.date_added === row.date_added &&
            start.tags === row.tags &&
            start.keyword === row.keyword)
        );
      }),
      outside: (await browserData.getBookmarks(otherFolder)).some(
        (row) =>
          row.id === outside && row.title === "Outside the assigned folders",
      ),
    };
    return {
      contextId,
      caseId: world.id,
      origin,
      folders,
      request,
      baseline,
      transitions,
      assignments: Object.fromEntries(ids),
      checks,
      passed: Object.values(checks).every(Boolean),
    };
  }

  async function rejectsOutside() {
    const basis = await runtime.browserLibraryState.observe();
    try {
      await runtime.browserLibraryChange.apply(basis.id, {
        kind: "rename",
        id: outside,
        title: "Must not change",
      });
    } catch (error) {
      return (
        error instanceof Error &&
        error.message.includes("outside the assigned library")
      );
    }
    return false;
  }

  return { request, services, verify, reference, close, rejectsOutside };
}
