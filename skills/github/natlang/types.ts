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
