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

export type OnboardingStage = "needs-token" | "connected" | "verified" | "error";

/** The part of `getGitHubOnboardingStatus()` a route needs. */
export type OnboardingStatus = {
  stage: OnboardingStage;
  connected: boolean;
  verified: boolean;
  /** The connected credential, when there is one. */
  credentialId?: string;
  /** Set when stage is "error": what failed. */
  error?: string;
};

/** What to do next in GitHub setup. */
export type Route = {
  /**
   * render-setup: show GitHubSetup.tsx so the user connects or upgrades the credential.
   * verify: the credential is saved but not verified yet.
   * proceed: GitHub is connected, verified and allowed to do what the user wants.
   * repair: setup itself failed; fix the reported error first.
   */
  action: "render-setup" | "verify" | "proceed" | "repair";
  /** For render-setup: the access level to preselect in the component. */
  accessLevel?: GitHubAccessLevel;
  /** The exact call to make next. */
  next: string;
  /** One sentence for the user. */
  reason: string;
};

/** Why a GitHub verification or Git operation failed. */
export type FailureCause =
  | "bad-credentials"
  | "missing-permission"
  | "org-approval"
  | "audience-mismatch"
  | "publish-preflight"
  | "unknown";

/** What to do about a GitHub failure. */
export type NextStep = {
  cause: FailureCause;
  /** In order, what to do. */
  steps: string[];
  /** Set when reconnecting with a specific access level fixes it. */
  accessLevel?: GitHubAccessLevel;
};
