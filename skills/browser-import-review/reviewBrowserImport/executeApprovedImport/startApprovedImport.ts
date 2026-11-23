import {browserImportStart} from "natlang:services";
import type {BrowserImportDispatch, ImportPreviewObservation} from "../../types.js";
/** Submit the reviewed preview to the caller-bound public import operation. */
export default async function startApprovedImport(observed: ImportPreviewObservation):Promise<BrowserImportDispatch>{
 return browserImportStart.start(observed);
}
