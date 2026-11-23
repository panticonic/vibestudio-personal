declare module "natlang:services" {
  export const browserLibraryState: {
    observe(): Promise<import("./types.js").BrowserLibrarySnapshot>;
  };
  export const browserLibraryChange: {
    apply(snapshotId: string, mutation: import("./types.js").LibraryMutation): Promise<import("./types.js").BrowserLibrarySnapshot>;
  };
}
