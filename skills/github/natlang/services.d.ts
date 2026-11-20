declare module "natlang:services" {
  import type {
    GitHubAccessLevel,
    GitHubDiagnosisObservation,
    GitHubSetupReceipt,
    GitHubSetupStatus,
  } from "./types.js";

  export const githubSetupRead: {
    inspect(operationId: string): Promise<GitHubSetupStatus>;
  };
  export const githubSetupRoute: {
    resolve(operationId: string, accessLevel: GitHubAccessLevel): Promise<GitHubSetupReceipt>;
  };
  export const githubDiagnosisRead: {
    inspect(operationId: string): Promise<GitHubDiagnosisObservation>;
  };
}
