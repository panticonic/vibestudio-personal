export type Action = "pause" | "resume";
export type State = "active" | "paused";
export type Monitor = {
  id: string;
  name: string;
  team: string;
  state: State;
  revision: string;
  reviewedRevision: string | null;
  needs: string[];
  permitted: Action[];
};
export type Queue = { id: string; monitors: Monitor[] };
export type Status =
  | "applied"
  | "unchanged"
  | "reconciled"
  | "held"
  | "uncertain";
export type Finding = {
  name: string;
  id: string | null;
  status: Status;
  state: State | null;
  revision: string | null;
  reviewedRevision: string | null;
  evidence: string;
};
export type Disposition = "complete" | "partial" | "held";
export type Plan =
  | { kind: "operate"; id: string; action: Action }
  | {
      kind: "record";
      name: string;
      id: string | null;
      status: "unchanged" | "held";
    }
  | { kind: "finish"; disposition: Disposition };
export type Receipt = "applied" | "already" | "blocked" | "interrupted";
export type Step = { queue: Queue; finding: Finding };
export type Report = { findings: Finding[]; disposition: Disposition };
