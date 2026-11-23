import {repositoryOwnerRead} from "natlang:services";
import type {PersonalSetupRequest} from "../../types.js";
/** Resolve the assigned repository's onboarding action against the current owner catalog. */
export default async function readOwnerRoute(operationId: string, action: "setup" | "check"):Promise<PersonalSetupRequest>{
 return repositoryOwnerRead.resolve(operationId, action);
}
