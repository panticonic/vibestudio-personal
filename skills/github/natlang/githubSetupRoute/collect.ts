/** The setup rules: what the onboarding stage and the stored credential's access level say to do next. No step needs a model: the agent names the access level. */
import { credentials } from "natlang:services";
import covers from "./covers.js";
import type { GitHubAccessLevel, OnboardingStatus, Route } from "../types.js";

const GITHUB_API_USER = "https://api.github.com/user";
const ACCESS_LEVELS: readonly string[] = [
  "read-only",
  "collaborate",
  "publish",
  "publish-pages",
  "code-workflows",
  "broad",
];

/** The component call that connects GitHub; the collaborate default needs no props. */
function setup(level: GitHubAccessLevel): string {
  return level === "collaborate"
    ? 'inline_ui({ path: "skills/github/GitHubSetup.tsx", props: {} })'
    : `inline_ui({ path: "skills/github/GitHubSetup.tsx", props: { accessLevel: "${level}" } })`;
}

export default async function collect(
  status: OnboardingStatus,
  needed: GitHubAccessLevel
): Promise<Route> {
  if (status.stage === "error") {
    return {
      action: "repair",
      next: "getGitHubOnboardingStatus()",
      reason: `Setup itself failed: ${status.error ?? "no error was reported"}. Fix that, then ask for the status again.`,
    };
  }
  if (status.stage === "needs-token") {
    return {
      action: "render-setup",
      accessLevel: needed,
      next: setup(needed),
      reason: `GitHub is not connected; connect it with ${needed} access.`,
    };
  }
  if (status.stage === "connected") {
    return {
      action: "verify",
      next: "getGitHubOnboardingStatus({ verify: true })",
      reason: "A credential is saved but has not been verified against GitHub yet.",
    };
  }
  const resolved = await credentials.resolveCredential({ url: GITHUB_API_USER });
  const held = resolved?.metadata?.["accessLevel"];
  if (held && ACCESS_LEVELS.includes(held) && !covers(held as GitHubAccessLevel, needed)) {
    return {
      action: "render-setup",
      accessLevel: needed,
      next: setup(needed),
      reason: `The connected credential has ${held} access, which does not cover ${needed}; reconnect with ${needed}.`,
    };
  }
  return {
    action: "proceed",
    next: "continue with the GitHub task",
    reason: "GitHub is connected and verified" + (held ? ` with ${held} access.` : "."),
  };
}
