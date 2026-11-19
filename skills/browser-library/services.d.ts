import type { BrowserLibrarySnapshot, LibraryMutation } from "./types.js";

declare module "natlang:services" {
  export const browserLibraryState: {
    observe(): Promise<BrowserLibrarySnapshot>;
  };
  export const browserLibraryChange: {
    apply(snapshotId: string, mutation: LibraryMutation): Promise<BrowserLibrarySnapshot>;
  };
}
