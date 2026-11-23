declare module "natlang:services" {
  export const artifactLibrary: {
    observe(): Promise<import("./types.js").ArtifactLibrary>;
    apply(
      basis: string,
      mutation: import("./types.js").ArtifactLibraryMutation,
    ): Promise<import("./types.js").ArtifactLibraryEffect>;
  };
  export const artifactCollection: {
    observe(): Promise<import("./types.js").ArtifactCollection>;
    apply(
      basis: string,
      mutation: import("./types.js").ArtifactCollectionMutation,
    ): Promise<import("./types.js").ArtifactCollectionEffect>;
    link(
      basis: string,
      panelId: string,
      libraryBasis: string,
      bookmarkId: number,
      heading: string,
    ): Promise<import("./types.js").ArtifactCollectionEffect>;
  };
}
