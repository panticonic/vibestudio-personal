import {githubSetupRoute} from "natlang:services";
import type {GitHubAccessLevel, GitHubSetupReceipt} from "../types.js";
/** Resolve the product's setup route using the same observed connection and the chosen access level. */
export default async function resolveGitHubRoute(operationId: string, accessLevel: GitHubAccessLevel):Promise<GitHubSetupReceipt>{
 return githubSetupRoute.resolve(operationId, accessLevel);
}
