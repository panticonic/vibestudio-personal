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
