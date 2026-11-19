export type TourScene = {
  id: string;
  title: string;
  position: number;
  eyebrow: string;
};

export type TourFrame = {
  storedScene: string;
  storedNotes: boolean;
  eyebrow: string;
  heading: string;
  progress: string;
  notesVisible: boolean;
};

export type TourRehearsalRequest = {
  operationId: string;
  goal: string;
  topics: string[];
  restore: boolean;
};

export type TourStart = {
  deck: TourScene[];
  allowed: string[];
  frame: TourFrame;
};

export type TourStop = {
  topic: string;
  scene: TourScene;
  notes: boolean;
};

export type TourPlan = {
  stops: TourStop[];
  unmatchedTopics: string[];
};

export type TourReadback = {
  frame: TourFrame;
  stage: "verified" | "mismatch";
};

export type TourVisit = {
  stop: TourStop;
  readback: TourReadback;
};

export type TourRehearsalReport = {
  start: TourStart;
  plan: TourPlan;
  visits: TourVisit[];
  restoration: TourReadback | null;
  outcome: "rehearsed" | "held" | "view-mismatch";
};
