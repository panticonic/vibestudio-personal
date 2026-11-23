import {decisionSource} from "natlang:services";
import type {DecisionFile} from "../../types.js";
/** Open the assigned VCS snapshot and file for the selected memory lead. */
export default async function readDecisionFile(leadId: string):Promise<DecisionFile | null>{
 return decisionSource.read(leadId);
}
