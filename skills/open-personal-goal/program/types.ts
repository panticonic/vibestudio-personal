export type BoardStatus = "inbox" | "ready" | "active" | "review" | "done" | "cancelled";
export type BoardCard = {
  id: string;
  projectId: string;
  title: string;
  revision: number;
  dependencies: string[];
  status: BoardStatus;
  automationId: string | null;
  updatedAt: number;
};
export type BoardSnapshot = {
  id: string;
  projects: { id: string; name: string; archived: boolean }[];
  cards: BoardCard[];
  complete: boolean;
};
export type CardLocator = { title: string; project: string | null };
export type MissionIntent =
  | { kind: "inspect" | "ready"; target: CardLocator }
  | { kind: "prerequisites"; target: CardLocator; requires: CardLocator[] }
  | { kind: "relocate"; target: CardLocator; destination: string };
export type MissionGoalPlan = { intents: MissionIntent[]; handoff: CardLocator[] };
export type BoardChange =
  | { kind: "ready"; cardId: string; revision: number }
  | { kind: "relocate"; cardId: string; revision: number; projectId: string }
  | { kind: "prerequisites"; cardId: string; revision: number; dependencies: string[] };
export type MissionDecision = {
  change: BoardChange | null;
  cardId: string | null;
  blockers: string[];
};
export type MissionFinding = {
  status: "held" | "observed" | "verified" | "unverified";
  cardId: string | null;
  cardStatus: BoardStatus | null;
  blockers: string[];
  evidence: string[];
};
export type MissionStep = { snapshot: BoardSnapshot; finding: MissionFinding };
export type ChangeResult = { status: "applied" | "changed"; snapshot: BoardSnapshot };
export type HandoffReceipt = { path: string; sha256: string; snapshotId: string; cardIds: string[] };
export type MissionGoalReport = { findings: MissionFinding[]; handoff: HandoffReceipt | null };
