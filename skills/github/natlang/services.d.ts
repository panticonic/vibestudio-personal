declare module "natlang:services" {
  import type {
    GitHubAccessLevel,
    GitHubDiagnosisObservation,
    GitHubSetupReceipt,
    GitHubSetupStatus,
  } from "./types.js";

  export const openGitHubWork: {
    discover(): Promise<import("./types.js").GitHubOpenCatalog>;
    inspect(
      revision: string,
      repositoryId: string,
    ): Promise<import("./types.js").GitHubLocalView | null>;
    preflight(
      revision: string,
      intent: import("./types.js").GitHubOpenIntent,
      access: import("./types.js").GitHubAccessLevel,
    ): Promise<import("./types.js").GitHubOpenPreflight | null>;
    stage(
      revision: string,
      decision: import("./types.js").GitHubOpenDecision,
    ): Promise<import("./types.js").GitHubOpenHandoff | null>;
  };
  export const githubSetupRead: {
    inspect(operationId: string): Promise<GitHubSetupStatus>;
  };
  export const githubSetupRoute: {
    resolve(
      operationId: string,
      accessLevel: GitHubAccessLevel,
    ): Promise<GitHubSetupReceipt>;
  };
  export const githubDiagnosisRead: {
    inspect(operationId: string): Promise<GitHubDiagnosisObservation>;
  };
}
