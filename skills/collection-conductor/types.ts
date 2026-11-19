export type CollectionRef = { title: string; parent?: string };
export type CollectionAction =
  | { kind: "rename"; target: CollectionRef; title: string }
  | { kind: "note"; target: CollectionRef; text: string | null }
  | { kind: "group"; parent: CollectionRef; title: string }
  | { kind: "move"; target: CollectionRef; parent: CollectionRef; after?: CollectionRef };
export type CollectionRequest = { goal: string; actions: CollectionAction[] };
export type CollectionNode = {
  id: string;
  parentId: string | null;
  title: string;
  source: string | null;
  contextId: string | null;
  note: string | null;
};
export type CollectionSnapshot = {
  id: string;
  rootId: string;
  complete: boolean;
  nodes: CollectionNode[];
};
export type CollectionMutation =
  | { kind: "rename"; panelId: string; title: string }
  | { kind: "note"; panelId: string; text: string | null }
  | { kind: "group"; parentId: string; title: string }
  | { kind: "move"; panelId: string; parentId: string; afterId: string | null };
export type CollectionFinding = {
  status: "verified" | "held" | "unverified";
  evidence: string[];
  panelId: string | null;
};
export type CollectionStep = { finding: CollectionFinding; current: CollectionSnapshot };
export type CollectionReport = { results: CollectionFinding[] };
