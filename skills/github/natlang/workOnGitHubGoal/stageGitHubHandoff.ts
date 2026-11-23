import {openGitHubWork} from "natlang:services";
import type {GitHubOpenDecision, GitHubOpenHandoff} from "../types.js";
/** Leave the owner's requested durable local handoff after checking the current evidence. */
export default async function stageGitHubHandoff(revision: string, decision: GitHubOpenDecision):Promise<GitHubOpenHandoff | null>{
 return openGitHubWork.stage(revision, decision);
}
