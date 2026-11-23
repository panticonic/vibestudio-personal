export type PublicImportCategory =
  | "bookmarks"
  | "history"
  | "searchEngines"
  | "favicons";

export type BrowserImportReviewRequest =
  | {
      goal: string;
      kind: "preview" | "recover";
      categories: PublicImportCategory[];
    }
  | {
      goal: string;
      kind: "execute";
      categories: PublicImportCategory[];
      approvedPreview: ImportPreviewObservation;
    };

export type BrowserImportDispatch = "started" | "held";

export type ImportSourceObservation = {
  state: "available" | "host-unavailable" | "source-unavailable" | "blocked";
  categories: PublicImportCategory[];
};

export type ImportTotal = { category: PublicImportCategory; total: number };
export type ImportPreviewObservation = {
  totals: ImportTotal[];
  status: "previewed" | "source-changed";
  warningCount: number;
};

export type ImportProgress = {
  category: PublicImportCategory;
  stored: number;
  skipped: number;
  errors: number;
};
export type RetainedImportObservation = {
  phase:
    | "queued"
    | "discovering"
    | "copying"
    | "reading"
    | "decrypting"
    | "normalizing"
    | "storing"
    | "reconciling"
    | "complete"
    | "cancelled"
    | "failed"
    | "partial";
  resumable: boolean;
  progress: ImportProgress[];
};
export type BrowserImportNext =
  | "review-preview"
  | "use-inspector"
  | "observe-existing"
  | "keep-results"
  | "review-retry";

export type BrowserImportReviewReport = {
  next: BrowserImportNext;
  source: ImportSourceObservation | null;
  totals: ImportTotal[];
  progress: ImportProgress[];
  findings: string[];
};

export type MigrationProfile = {
  id: string;
  label: string;
  device: string;
  categories: PublicImportCategory[];
  approved: PublicImportCategory[];
  retained: RetainedImportObservation["phase"] | null;
};
export type MigrationCatalog = {
  revision: string;
  profiles: MigrationProfile[];
  collection: string | null;
};
export type MigrationChoice = {
  sourceId: string;
  operation: "preview" | "execute" | "recover";
  categories: PublicImportCategory[];
};
export type MigrationBookmark = { title: string; url: string };
export type MigrationTarget = {
  id: string;
  title: string;
  parent: string | null;
};
export type MigrationHandoffView = {
  revision: string;
  receiptId: string;
  bookmarks: MigrationBookmark[];
  targets: MigrationTarget[];
};
export type MigrationHandoffChoice = {
  bookmark: MigrationBookmark;
  targetId: string;
};
export type MigrationDelivery = {
  receiptId: string;
  targetId: string;
  bookmark: MigrationBookmark;
  note: string;
};
export type MigrationOutcomeEvidence = {
  preview: ImportPreviewObservation | null;
  approvedPreview: ImportPreviewObservation | null;
  receiptId: string | null;
  phase: RetainedImportObservation["phase"] | null;
  retainedBookmarks: MigrationBookmark[];
};
export type OpenMigrationReport =
  | { status: "unresolved"; reason: string }
  | {
      status: "observed" | "imported" | "retained" | "held" | "handed-off";
      review: BrowserImportReviewReport;
      receiptId: string | null;
      phase: RetainedImportObservation["phase"] | null;
      bookmarks: MigrationBookmark[];
      delivery: MigrationDelivery | null;
    };
