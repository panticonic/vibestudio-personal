import type {OpenMigrationReport,BrowserImportReviewReport,MigrationOutcomeEvidence,MigrationDelivery} from "../types.js";
export default function migrationResult(status:"observed"|"imported"|"retained"|"held"|"handed-off",review:BrowserImportReviewReport,evidence:MigrationOutcomeEvidence,delivery:MigrationDelivery|null):OpenMigrationReport {
 return {status,review,receiptId:evidence.receiptId,phase:evidence.phase,bookmarks:evidence.retainedBookmarks,delivery};
}
