import { browserData } from "@workspace/runtime";
import type {
  BrowserLibrarySnapshot,
  LibraryMutation,
} from "../browser-library/types.js";

export type BrowserLibraryScope = {
  folders: readonly string[];
  origins: readonly string[];
};

const maximumRows = 120;

export function bindBrowserLibrary(scope: BrowserLibraryScope) {
  const folders = [...new Set(scope.folders)];
  const origins = [
    ...new Set(
      scope.origins.map((origin) => {
        const parsed = new URL(origin);
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
          throw new Error("Browser library scope requires HTTP or HTTPS origins");
        }
        return parsed.origin;
      }),
    ),
  ];
  let current: BrowserLibrarySnapshot | undefined;
  let busy = false;

  function allowsUrl(url: string) {
    try {
      return origins.includes(new URL(url).origin);
    } catch {
      return false;
    }
  }

  async function read(): Promise<BrowserLibrarySnapshot> {
    const [bookmarkPages, historyPages] = await Promise.all([
      Promise.all(folders.map((folder) => browserData.getBookmarks(folder))),
      Promise.all(
        origins.map((origin) =>
          // Keep the provider's escaped SQLite LIKE pattern short. The full
          // origin is checked below before any row becomes model-visible.
          browserData.getHistory({
            search: origin.slice(0, 24),
            limit: maximumRows + 1,
          }),
        ),
      ),
    ]);
    const bookmarks = bookmarkPages
      .flat()
      .flatMap((row) =>
        typeof row.url === "string" && allowsUrl(row.url)
          ? [
              {
                id: row.id,
                folder: row.folder_path,
                title: row.title,
                url: row.url,
              },
            ]
          : [],
      );
    const visits = new Map<string, BrowserLibrarySnapshot["visits"][number]>();
    for (const row of historyPages.flat()) {
      if (allowsUrl(row.url)) {
        visits.set(row.url, {
          url: row.url,
          title: row.title ?? "",
          lastVisitTime: row.last_visit,
        });
      }
    }
    if (
      bookmarks.length > maximumRows ||
      visits.size > maximumRows ||
      historyPages.some((page) => page.length > maximumRows)
    ) {
      throw new Error(
        "The assigned browser library exceeds the observation window",
      );
    }
    return {
      id: crypto.randomUUID(),
      availableFolders: folders,
      bookmarks: bookmarks.sort((a, b) => a.id - b.id),
      visits: [...visits.values()].sort((a, b) => a.url.localeCompare(b.url)),
    };
  }

  function requireDestination(
    snapshot: BrowserLibrarySnapshot,
    folder: string,
    url: string,
  ) {
    if (
      !folders.includes(folder) ||
      snapshot.bookmarks.some((row) => row.folder === folder && row.url === url)
    ) {
      throw new Error(
        "The destination is unavailable or already contains that URL",
      );
    }
  }

  async function mutate(
    mutation: LibraryMutation,
    snapshot: BrowserLibrarySnapshot,
  ) {
    if (mutation.kind === "save") {
      requireDestination(snapshot, mutation.folder, mutation.url);
      if (
        !mutation.title.trim() ||
        !snapshot.visits.some((visit) => visit.url === mutation.url)
      ) {
        throw new Error(
          "A recovered bookmark needs an observed visit and a title",
        );
      }
      await browserData.addBookmark({
        folderPath: mutation.folder,
        url: mutation.url,
        title: mutation.title,
      });
      return;
    }
    const target = snapshot.bookmarks.find(({ id }) => id === mutation.id);
    if (!target)
      throw new Error("The bookmark is outside the assigned library");
    if (mutation.kind === "rename") {
      if (!mutation.title.trim()) throw new Error("A bookmark needs a title");
      await browserData.updateBookmark(target.id, { title: mutation.title });
    } else if (mutation.kind === "file") {
      requireDestination(snapshot, mutation.folder, target.url);
      await browserData.updateBookmark(target.id, {
        folderPath: mutation.folder,
      });
    } else {
      const keep = snapshot.bookmarks.find(({ id }) => id === mutation.keepId);
      if (!keep || keep.id === target.id || keep.url !== target.url) {
        throw new Error("The identical saved copy must be retained");
      }
      await browserData.deleteBookmark(target.id);
    }
  }

  async function exclusive(run: () => Promise<BrowserLibrarySnapshot>) {
    if (busy) throw new Error("A browser-library operation is already running");
    busy = true;
    try {
      current = await run();
      return structuredClone(current);
    } finally {
      busy = false;
    }
  }

  return {
    browserLibraryState: { observe: () => exclusive(read) },
    browserLibraryChange: {
      apply: (id: string, mutation: LibraryMutation) =>
        exclusive(async () => {
          const basis = current;
          if (!basis || basis.id !== id)
            throw new Error(
              "The supplied browser-library observation is unavailable",
            );
          const snapshot = await read();
          if (
            JSON.stringify(snapshot.bookmarks) !==
              JSON.stringify(basis.bookmarks) ||
            JSON.stringify(snapshot.visits) !== JSON.stringify(basis.visits)
          ) {
            throw new Error(
              "The browser library has changed since it was observed",
            );
          }
          await mutate(mutation, snapshot);
          return await read();
        }),
    },
  };
}
