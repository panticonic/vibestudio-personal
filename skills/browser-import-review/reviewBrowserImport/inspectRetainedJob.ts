import {browserImportHistory} from "natlang:services";
import type {RetainedImportObservation} from "../types.js";
/** Observe exactly the caller's retained public import receipt. */
export default async function inspectRetainedJob():Promise<RetainedImportObservation | null>{
 return browserImportHistory.observe();
}
