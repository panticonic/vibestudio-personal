import type {
  ArtifactCollection,
  ArtifactCollectionEffect,
  ArtifactCollectionMutation,
  ArtifactLibrary,
  ArtifactLibraryEffect,
  ArtifactLibraryMutation,
} from "./types.js";

declare module "natlang:services" {
  export const artifactLibrary: {
    observe(): Promise<ArtifactLibrary>;
    apply(
      basis: string,
      mutation: ArtifactLibraryMutation,
    ): Promise<ArtifactLibraryEffect>;
  };
  export const artifactCollection: {
    observe(): Promise<ArtifactCollection>;
    apply(
      basis: string,
      mutation: ArtifactCollectionMutation,
    ): Promise<ArtifactCollectionEffect>;
    link(
      basis: string,
      panelId: string,
      libraryBasis: string,
      bookmarkId: number,
      heading: string,
    ): Promise<ArtifactCollectionEffect>;
  };
}
