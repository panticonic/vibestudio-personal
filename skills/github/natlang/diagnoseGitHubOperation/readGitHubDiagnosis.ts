import {githubDiagnosisRead} from "natlang:services";
import type {GitHubDiagnosisObservation} from "../types.js";
/** Read the bounded outcome of the caller-assigned local GitHub preflight. */
export default async function readGitHubDiagnosis(operationId: string):Promise<GitHubDiagnosisObservation>{
 return githubDiagnosisRead.inspect(operationId);
}
