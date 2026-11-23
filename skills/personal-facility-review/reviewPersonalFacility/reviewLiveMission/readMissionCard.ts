import {missionFacilityRead} from "natlang:services";
import type {MissionFacilityEvidence} from "../../types.js";
/** Read the exact assigned Mission Control card and its prerequisite state. */
export default async function readMissionCard(operationId: string):Promise<MissionFacilityEvidence>{
 return missionFacilityRead.inspect(operationId);
}
