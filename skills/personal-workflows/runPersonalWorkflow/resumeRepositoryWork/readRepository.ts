import {repositoryResumeRead} from "natlang:services";
import type {PersonalRepoRequest} from "../../types.js";
/** Read the assigned repository's current local and GitHub owner state. */
export default async function readRepository(operationId: string):Promise<PersonalRepoRequest>{
 return repositoryResumeRead.inspect(operationId);
}
