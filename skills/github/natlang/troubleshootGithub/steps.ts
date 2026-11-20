/** The documented fix for each cause (skills/github/TROUBLESHOOTING.md), as data. */
import type { FailureCause, NextStep } from "../types.js";

const FIXES: Record<FailureCause, Omit<NextStep, "cause">> = {
  "bad-credentials": {
    steps: [
      "Create a new token: render skills/github/GitHubSetup.tsx with inline_ui and save it again.",
      "Run getGitHubOnboardingStatus({ verify: true }) to confirm the new credential.",
    ],
  },
  "missing-permission": {
    steps: [
      "In GitHub, add repository access or the missing fine-grained permission to the token, or reconnect with an access level that includes it.",
      "Run verifyGitHubCredential(credentialId) again.",
    ],
  },
  "org-approval": {
    steps: [
      "Ask an owner of the organization to approve the fine-grained token in the organization's settings.",
      "Run verifyGitHubGitRemoteAccess(remoteUrl, credentialId) again.",
    ],
  },
  "audience-mismatch": {
    steps: [
      "Retry with the credentialId that getGitHubOnboardingStatus() returned, or omit credentialId so the runtime picks the connected GitHub credential.",
    ],
  },
  "publish-preflight": {
    steps: [
      'Reconnect with the "publish" access level: it needs contents: write, repository Administration: write, and both the GitHub API and Git HTTPS bindings.',
      "Retry publishToGitHub.",
    ],
    accessLevel: "publish",
  },
  "invalid-remote": {
    steps: [
      "Use the assigned repository's HTTPS Git URL on github.com with a .git path, then repeat the local remote check.",
    ],
  },
  "not-connected": {
    steps: [
      "Use the GitHub setup owner to connect the minimum access needed for the requested work.",
    ],
  },
  unknown: {
    steps: [
      "Report the exact status code and message to the user, and read skills/github/TROUBLESHOOTING.md for a matching case.",
    ],
  },
};

export default function steps(cause: FailureCause): NextStep {
  return { cause, ...FIXES[cause] };
}
