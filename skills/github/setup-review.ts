import {
  getGitHubOnboardingStatus,
  routeGitHubSetup,
  type GitHubAccessLevel,
} from "./index.js";
import type { GitHubSetupRequest } from "./natlang/types.js";

export function bindGitHubSetupReview(
  goal: string,
  interactive: boolean,
  readStatus: typeof getGitHubOnboardingStatus = getGitHubOnboardingStatus,
) {
  const request: GitHubSetupRequest = {
    goal,
    operationId: crypto.randomUUID(),
    interactive,
  };
  let claimed = false;
  let routed = false;
  let observed:
    | Awaited<ReturnType<typeof getGitHubOnboardingStatus>>
    | undefined;
  return {
    request,
    services: {
      githubSetupRead: {
        async inspect(operationId: string) {
          if (operationId !== request.operationId || claimed)
            throw new Error(
              "GitHub status can only be read for the assigned setup review",
            );
          claimed = true;
          observed = await readStatus();
          const { stage, connected, verified } = observed;
          return { stage, connected, verified };
        },
      },
      githubSetupRoute: {
        async resolve(operationId: string, accessLevel: GitHubAccessLevel) {
          if (operationId !== request.operationId || !observed || routed)
            throw new Error(
              "Read the assigned GitHub connection before resolving its setup route",
            );
          routed = true;
          // Raw provider errors, account identities and credential inventory remain in the host scope.
          const { stage, credentialId, credentials } = observed;
          return routeGitHubSetup(
            {
              stage,
              credentialId,
              credentials,
              ...(stage === "error"
                ? { error: "The local connection status could not be read" }
                : {}),
            },
            accessLevel,
          );
        },
      },
    },
  };
}
