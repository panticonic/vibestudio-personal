export type ArtifactBookmark = {
  id: number;
  folder: string;
  title: string;
  url: string;
};
export type ArtifactVisit = {
  url: string;
  title: string;
  lastVisitTime: number;
};
export type ArtifactLibrary = {
  id: string;
  availableFolders: string[];
  bookmarks: ArtifactBookmark[];
  visits: ArtifactVisit[];
};
export type ArtifactLibraryMutation =
  | { kind: "save"; folder: string; url: string; title: string }
  | { kind: "rename"; id: number; title: string }
  | { kind: "file"; id: number; folder: string }
  | { kind: "retire"; id: number; keepId: number };
export type ArtifactLibraryDecision =
  | { kind: "mutate"; mutation: ArtifactLibraryMutation }
  | { kind: "finish"; bookmarkId: number | null; held: boolean };
export type ArtifactLibraryResult = {
  held: boolean;
  bookmarkId: number | null;
  state: ArtifactLibrary;
};
export type ArtifactNode = {
  id: string;
  parentId: string | null;
  title: string;
  source: string | null;
  contextId: string | null;
  note: string | null;
};
export type ArtifactCollection = {
  id: string;
  rootId: string;
  complete: boolean;
  nodes: ArtifactNode[];
};
export type ArtifactCollectionMutation =
  | { kind: "note"; panelId: string; text: string | null }
  | { kind: "group"; parentId: string; title: string }
  | { kind: "move"; panelId: string; parentId: string; afterId: string | null };
export type ArtifactCollectionDecision =
  | { kind: "change"; mutation: ArtifactCollectionMutation }
  | { kind: "link"; panelId: string; heading: string }
  | { kind: "finish"; held: boolean };
export type ArtifactCollectionResult = {
  held: boolean;
  state: ArtifactCollection;
};
export type ArtifactMutationStatus = "applied" | "changed" | "held";
export type ArtifactLibraryEffect = {
  status: ArtifactMutationStatus;
  state: ArtifactLibrary;
};
export type ArtifactCollectionEffect = {
  status: ArtifactMutationStatus;
  state: ArtifactCollection;
};
/** Requested preservation findings identify the concrete conflicting references. */
export type ArtifactHold =
  | { kind: "different-urls"; left: ArtifactBookmark; right: ArtifactBookmark }
  | { kind: "tied-latest-visits"; reference: string; urls: string[] };
export type PersonalArtifactsReport =
  | { kind: "changed"; library?: ArtifactLibraryResult; collection?: ArtifactCollectionResult; holds: ArtifactHold[] }
  | { kind: "held"; holds: ArtifactHold[] }
  | { kind: "unchanged"; library?: ArtifactLibraryResult; collection?: ArtifactCollectionResult };
