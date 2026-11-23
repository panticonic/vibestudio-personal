import {decisionRecall} from "natlang:services";
import type {DecisionLead} from "../../types.js";
/** Search the scoped workspace memory index for this decision. */
export default async function searchHistory(query: string):Promise<DecisionLead[]>{
 return decisionRecall.search(query);
}
