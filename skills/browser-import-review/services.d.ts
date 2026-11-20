import type {
  ImportPreviewObservation,
  ImportSourceObservation,
  RetainedImportObservation,
} from "./types.js";

declare module "natlang:services" {
  export const browserImportSource: {
    observe(): Promise<ImportSourceObservation>;
  };
  export const browserImportPreview: {
    observe(): Promise<ImportPreviewObservation>;
  };
  export const browserImportHistory: {
    observe(): Promise<RetainedImportObservation | null>;
  };
}
