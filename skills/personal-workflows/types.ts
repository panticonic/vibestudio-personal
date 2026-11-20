export type PersonalMemoryKind = "message" | "file" | "commit";
export type PersonalMemoryRequest = {
  goal: string;
  query: string;
  kinds: PersonalMemoryKind[];
  asOf: string;
};
export type PersonalMemoryResult = {
  kind: string;
  snippet: string;
  where: string;
  appendedAt: string | null;
  path?: string | null;
  eventId?: string | null;
  logId?: string | null;
  head?: string | null;
  contentHash?: string | null;
};
export type PersonalMemoryHit = {
  id: string;
  kind: PersonalMemoryKind;
  snippet: string;
  where: string;
  appendedAt: string | null;
  path: string | null;
  eventId: string | null;
  logId: string | null;
  head: string | null;
  contentHash: string | null;
};
export type PersonalMemoryQuestion = {
  query: string;
  kinds: PersonalMemoryKind[];
};
export type PersonalMemoryStatus =
  | "no-evidence"
  | "conversation-only"
  | "single-source"
  | "historical"
  | "conflicting"
  | "corroborated";
export type PersonalMemoryClaim = { statement: string; evidenceIds: string[] };
export type PersonalMemoryReport = {
  query: string;
  status: PersonalMemoryStatus;
  claims: PersonalMemoryClaim[];
  evidence: PersonalMemoryHit[];
  verify: string[];
};

export type PersonalCapability = {
  id: string;
  label: string;
  owner: string;
  state:
    | "connected"
    | "connected-unverified"
    | "configured"
    | "using-defaults"
    | "not-configured"
    | "in-progress"
    | "needs-attention"
    | "unavailable"
    | "unknown";
};
export type PersonalOwnerRoute = {
  id: string;
  capabilityId: string;
  action: string;
  via: "owner-skill" | "model-settings" | "conversation";
  ownerSkillPath: string | null;
};
export type PersonalSetupRequest = {
  goal: string;
  selection: PersonalOwnerRoute | null;
  capabilities: PersonalCapability[];
  origin: "welcome" | "selection" | "refresh" | "workspace-creation";
};
export type PersonalSetupAction =
  | "open-overview"
  | "refresh-overview"
  | "follow-owner-route"
  | "open-workspace-chooser"
  | "clarify";
export type PersonalSetupReport = {
  action: PersonalSetupAction;
  capabilityIds: string[];
  routeId: string | null;
  workspaceScope: "current" | "separate";
  unknownIds: string[];
  brief: string;
};

export type PersonalAccess =
  | "read-only"
  | "collaborate"
  | "publish"
  | "publish-pages"
  | "code-workflows"
  | "broad";
export type PersonalRepoAction =
  | "inspect"
  | "clone"
  | "pull"
  | "edit-local"
  | "push"
  | "create-repository"
  | "pages"
  | "workflow-change";
export type PersonalRepoRequest = {
  goal: string;
  repository: string;
  remoteVerified: boolean | null;
  availableAccess: PersonalAccess[] | null;
  workingTree: "clean" | "dirty" | "unknown";
  upstream: "aligned" | "ahead" | "behind" | "diverged" | "unknown";
};
export type PersonalRepoDecision =
  | "inspect"
  | "prepare-local"
  | "verify-remote"
  | "check-access"
  | "request-access"
  | "review-local-changes"
  | "reconcile-history"
  | "plan-requested-effect"
  | "clarify";
export type PersonalRepoReport = {
  repository: string;
  operation: PersonalRepoAction;
  access: PersonalAccess;
  decision: PersonalRepoDecision;
  facts: string[];
  next: string[];
};
export type RepositoryResumeInput = { goal: string; operationId: string };
export type RepositoryOwnerAction = "setup" | "check" | "skip";
export type RepositoryResumeReport = {
  repository: PersonalRepoReport;
  owner: PersonalSetupReport | null;
};
export type PersonalWork =
  | { kind: "recallWorkspace"; input: PersonalMemoryRequest }
  | { kind: "routeSetup"; input: PersonalSetupRequest }
  | { kind: "planRepositoryWork"; input: PersonalRepoRequest }
  | { kind: "resumeRepositoryWork"; input: RepositoryResumeInput };
export type PersonalWorkResult =
  | { kind: "recallWorkspace"; report: PersonalMemoryReport }
  | { kind: "routeSetup"; report: PersonalSetupReport }
  | { kind: "planRepositoryWork"; report: PersonalRepoReport }
  | { kind: "resumeRepositoryWork"; report: RepositoryResumeReport };
export type PersonalWorkflowRequest = { goal: string; work: PersonalWork[] };
export type PersonalWorkflowReport = {
  results: PersonalWorkResult[];
  unresolved: string[];
};
