export type CardRef = { title: string; project?: string };
export type MissionStatus = "inbox" | "ready" | "active" | "review" | "done" | "cancelled";
export type MissionProject = { id: string; name: string; archived: boolean };
export type MissionCard = {
  id: string;
  projectId: string;
  title: string;
  revision: number;
  dependencies: string[];
  status: MissionStatus;
  automationId: string | null;
  updatedAt: number;
};
export type MissionSnapshot = {
  id: string;
  projects: MissionProject[];
  cards: MissionCard[];
  complete: boolean;
};
export type MissionProposal =
  | { kind: "prerequisites"; target: CardRef; requires: CardRef[] }
  | { kind: "relocate"; target: CardRef; destination: string }
  | { kind: "ready"; target: CardRef };

export type MissionChanges =
  | { cardId: string; revision: number; kind: "prerequisites"; dependencies: string[] }
  | { cardId: string; revision: number; kind: "relocate"; projectId: string }
  | { cardId: string; revision: number; kind: "ready" };
export type MissionDecision = {
  changes: MissionChanges | null;
  blockers: string[];
};
export type MissionPlanningRequest = { goal: string; proposals: MissionProposal[] };
export type MissionFinding = {
  status: "verified" | "held" | "unverified";
  cardId: string | null;
  blockers: string[];
  evidence: string[];
};
export type MissionPlanningReport = { findings: MissionFinding[] };
export type MissionPlanStep = { snapshot: MissionSnapshot; finding: MissionFinding };
