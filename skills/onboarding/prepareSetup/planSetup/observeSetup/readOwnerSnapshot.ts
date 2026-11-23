import {onboardingRead} from "natlang:services";
import type {SetupObservation} from "../../types.js";
/** Read the actual onboarding receipt within the caller's workspace. */
export default async function readOwnerSnapshot():Promise<SetupObservation>{
 return onboardingRead.inspect();
}
