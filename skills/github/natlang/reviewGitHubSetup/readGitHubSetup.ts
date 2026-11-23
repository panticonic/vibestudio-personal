import {githubSetupRead} from "natlang:services";
import type {GitHubSetupStatus} from "../types.js";
/** Read local connection state for the assigned GitHub setup review. */
export default async function readGitHubSetup(operationId: string):Promise<GitHubSetupStatus>{
 return githubSetupRead.inspect(operationId);
}
