export type SetupIntent =
  | "welcome"
  | "refresh"
  | "selection"
  | "workspace-creation";
export type SetupRequest = { goal: string; intent: SetupIntent };
export type OwnerState =
  | "connected"
  | "connected-unverified"
  | "configured"
  | "using-defaults"
  | "not-configured"
  | "in-progress"
  | "needs-attention"
  | "unavailable"
  | "unknown";
export type SetupRow = { id: string; state: OwnerState; observed: boolean };
export type SetupRoute = {
  capabilityId: string;
  action: string;
  via:
    | "owner-skill"
    | "about-page"
    | "model-settings"
    | "panel"
    | "shell-navigation"
    | "conversation";
  destination: string | null;
};
export type SetupObservation = {
  receipt: string;
  rows: SetupRow[];
  route: SetupRoute | null;
};
export type PlanStatus =
  | "overview"
  | "refresh-overview"
  | "route-owner"
  | "route-client"
  | "invalid-selection"
  | "separate-workspace";
export type SetupPlan = {
  receipt: string;
  status: PlanStatus;
  rows: SetupRow[];
  route: SetupRoute | null;
  unknown: string[];
  needsVerification: string[];
};
