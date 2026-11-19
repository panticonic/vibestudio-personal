import type { CollectionMutation, CollectionSnapshot } from "./types.js";

declare module "natlang:services" {
  export const collectionState: { observe(): Promise<CollectionSnapshot> };
  export const collectionChange: {
    apply(basisId: string, mutation: CollectionMutation): Promise<CollectionSnapshot>;
  };
}
