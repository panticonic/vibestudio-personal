export type BookmarkRef = { folder: string; title?: string; url?: string };

export type BrowserLibraryAction =
  | { kind: "recover"; query: string; folder: string; title?: string }
  | { kind: "rename"; target: BookmarkRef; title: string }
  | { kind: "file"; target: BookmarkRef; folder: string }
  | { kind: "retire"; target: BookmarkRef; keep: BookmarkRef };

export type BrowserLibraryRequest = { goal: string; actions: BrowserLibraryAction[] };
export type LibraryBookmark = { id: number; folder: string; title: string; url: string };
export type LibraryVisit = { url: string; title: string; lastVisitTime: number };
export type BrowserLibrarySnapshot = {
  id: string;
  availableFolders: string[];
  bookmarks: LibraryBookmark[];
  visits: LibraryVisit[];
};

export type LibraryMutation =
  | { kind: "save"; folder: string; url: string; title: string }
  | { kind: "rename"; id: number; title: string }
  | { kind: "file"; id: number; folder: string }
  | { kind: "retire"; id: number; keepId: number };

export type LibraryFinding = {
  status: "verified" | "held" | "unverified";
  bookmarkId: number | null;
  evidence: string[];
};
export type BrowserLibraryReport = { findings: LibraryFinding[] };
export type LibraryStep = { finding: LibraryFinding; snapshot: BrowserLibrarySnapshot };
