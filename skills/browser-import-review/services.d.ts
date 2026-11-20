import type {
  BrowserImportDispatch,
  ImportPreviewObservation,
  ImportSourceObservation,
  RetainedImportObservation,
} from "./types.js";

declare module "natlang:services" {
  export const browserImportStart: {
    start(observed: ImportPreviewObservation): Promise<BrowserImportDispatch>;
  };
  export const browserImportSource: {
    observe(): Promise<ImportSourceObservation>;
  };
  export const browserImportPreview: {
    observe(): Promise<ImportPreviewObservation>;
  };
  export const browserImportHistory: {
    observe(): Promise<RetainedImportObservation | null>;
  };
  export const openBrowserMigration: {
    discover(): Promise<import("./types.js").MigrationCatalog>;
    bind(
      revision: string,
      choice: import("./types.js").MigrationChoice,
    ): Promise<import("./types.js").BrowserImportReviewRequest | null>;
    readOutcome(): Promise<import("./types.js").MigrationOutcomeEvidence>;
    inspectHandoff(
      review: import("./types.js").BrowserImportReviewReport,
    ): Promise<import("./types.js").MigrationHandoffView | null>;
    stageHandoff(
      revision: string,
      choice: import("./types.js").MigrationHandoffChoice,
    ): Promise<import("./types.js").MigrationDelivery | null>;
  };
}
