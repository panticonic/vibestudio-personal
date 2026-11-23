declare module "natlang:services" {
  export const browserImportStart: {
    start(observed: import("./types.js").ImportPreviewObservation): Promise<import("./types.js").BrowserImportDispatch>;
  };
  export const browserImportSource: {
    observe(): Promise<import("./types.js").ImportSourceObservation>;
  };
  export const browserImportPreview: {
    observe(): Promise<import("./types.js").ImportPreviewObservation>;
  };
  export const browserImportHistory: {
    observe(): Promise<import("./types.js").RetainedImportObservation | null>;
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
