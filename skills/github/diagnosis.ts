import { credentials } from "@workspace/runtime";
import {
  GitHubCredentialsUnavailableError,
  preflightGitHubPublishCredential,
} from "@workspace/integrations/github";
import { normalizeGitHubRemoteUrl } from "./index.js";
import { bindGitHubSetupReview } from "./setup-review.js";
import type { GitHubDiagnosisObservation, GitHubDiagnosisRequest } from "./natlang/types.js";

type Check =
  | { kind: "remote"; remoteUrl: string }
  | { kind: "publish"; publication: "repository" | "pages"; interactive: boolean };

export function bindGitHubDiagnosis(goal: string, check: Check) {
  const request: GitHubDiagnosisRequest = { goal, operationId: crypto.randomUUID() };
  const setup = check.kind === "publish" ? bindGitHubSetupReview(goal, check.interactive) : null;
  let needsSetup = false;

  async function inspect(operationId: string): Promise<GitHubDiagnosisObservation> {
    if (operationId !== request.operationId)
      throw new Error("Read only the assigned GitHub preflight");
    needsSetup = false;
    if (check.kind === "remote") {
      try {
        normalizeGitHubRemoteUrl(check.remoteUrl);
        return { operationId, failure: null, setup: null };
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        return { operationId, failure: "Invalid GitHub remote URL for local verification.", setup: null };
      }
    }
    try {
      await preflightGitHubPublishCredential(credentials, { publication: check.publication });
      return { operationId, failure: null, setup: null };
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      needsSetup = error instanceof GitHubCredentialsUnavailableError;
      return {
        operationId,
        failure: needsSetup
          ? "No active GitHub credential is available."
          : "The local GitHub publish credential selection failed.",
        setup: needsSetup ? setup?.request ?? null : null,
      };
    }
  }

  return {
    request,
    services: {
      githubDiagnosisRead: { inspect },
      ...(setup ? {
        githubSetupRead: {
          async inspect(operationId: string) {
            if (!needsSetup) throw new Error("The assigned preflight did not hand off to setup");
            return setup.services.githubSetupRead.inspect(operationId);
          },
        },
        githubSetupRoute: setup.services.githubSetupRoute,
      } : {}),
    },
  };
}
