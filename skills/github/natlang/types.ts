/** How much a GitHub credential may do, as the setup component offers it. */
export type GitHubAccessLevel =
  /** Look: read repositories, issues and pull requests; clone and pull. Nothing is changed. */
  | "read-only"
  /** Work with code in existing repositories: push, issues, pull requests. The default for repository work. */
  | "collaborate"
  /** Create repositories (adds Administration: write), push, issues and pull requests. */
  | "publish"
  /** Publish a website: create a repository, push source, configure GitHub Pages. */
  | "publish-pages"
  /** Collaborate, and also change GitHub Actions workflow files. */
  | "code-workflows"
  /** The broadest supported permissions. Only when the user explicitly asks for full access. */
  | "broad";

/** Why a GitHub verification or Git operation failed. */
export type FailureCause =
  | "bad-credentials"
  | "missing-permission"
  | "org-approval"
  | "audience-mismatch"
  | "publish-preflight"
  | "invalid-remote"
  | "not-connected"
  | "unknown";

/** What to do about a GitHub failure. */
export type NextStep = {
  cause: FailureCause;
  /** In order, what to do. */
  steps: string[];
  /** Set when reconnecting with a specific access level fixes it. */
  accessLevel?: GitHubAccessLevel;
};

export type GitHubSetupRequest = {
  goal: string;
  operationId: string;
  interactive: boolean;
};
export type GitHubSetupStatus = {
  stage: "needs-token" | "connected" | "verified" | "error";
  connected: boolean;
  verified: boolean;
};
export type GitHubSetupReceipt = {
  action: "render-setup" | "verify" | "proceed" | "repair";
  accessLevel?: GitHubAccessLevel;
  next: string;
  reason: string;
};
export type GitHubSetupHandoff =
  | "offer-setup"
  | "interactive-required"
  | "verify"
  | "proceed"
  | "repair";
export type GitHubSetupReport = {
  status: GitHubSetupStatus;
  accessLevel: GitHubAccessLevel;
  route: GitHubSetupReceipt;
  handoff: GitHubSetupHandoff;
};
export type GitHubDiagnosisRequest = { goal: string; operationId: string };
export type GitHubDiagnosisObservation = {
  operationId: string;
  failure: string | null;
  setup: GitHubSetupRequest | null;
};
export type GitHubDiagnosisReport = {
  observation: GitHubDiagnosisObservation;
  diagnosis: NextStep | null;
  setup: GitHubSetupReport | null;
};

export type GitHubOpenRepository = {
  id: string;
  title: string;
  intendedOwner: string;
};
export type GitHubApproval = {
  id: string;
  owner: string;
  state: "approved" | "pending" | "denied" | "partial" | "expired";
};
export type GitHubOpenProfile = {
  id: string;
  owner: string;
  label: string;
  approval: GitHubApproval;
  retained: GitHubApproval[];
};
export type GitHubOpenCatalog = {
  revision: string;
  repositories: GitHubOpenRepository[];
  profiles: GitHubOpenProfile[];
  interactive: boolean;
};
export type GitHubLocalView = {
  id: string;
  repository: GitHubOpenRepository;
  head: string;
  branch: string | null;
  trackedHead: string | null;
  ahead: number;
  behind: number;
  changes: string[];
  remote: string | null;
  normalizedRemote: string | null;
  remoteOwner: string | null;
};
export type GitHubOpenIntent = {
  repositoryId: string;
  localOnly: boolean;
  explicitOwner: string | null;
  profileId: string | null;
};
export type GitHubOpenPreflight = {
  id: string;
  status:
    | "available"
    | "unconnected"
    | "ambiguous"
    | "wrong-owner"
    | "scope-or-binding"
    | "profile-unavailable";
  failure: string | null;
  profile: GitHubOpenProfile | null;
  setup: GitHubSetupRequest | null;
};
export type GitHubOpenRoute =
  | "report-local"
  | "repair-remote"
  | "preserve-local-work"
  | "integrate-local-history"
  | "choose-account"
  | "wait-for-owner"
  | "offer-setup"
  | "verify-account"
  | "repair-account"
  | "request-scoped-access"
  | "ready-for-owner";
export type GitHubOpenDecision = {
  route: GitHubOpenRoute;
  access: GitHubAccessLevel;
  profileId: string | null;
  currentApproval: string | null;
  retainedApprovals: string[];
  reason: string;
};
export type GitHubOpenHandoff = {
  revision: string;
  receipt: string;
  decision: GitHubOpenDecision;
};
export type OpenGitHubReport =
  | { status: "unresolved"; reason: string }
  | {
      status: "reviewed";
      setup: GitHubSetupReport | null;
      diagnosis: NextStep | null;
      decision: GitHubOpenDecision;
      handoff: GitHubOpenHandoff | null;
    };
