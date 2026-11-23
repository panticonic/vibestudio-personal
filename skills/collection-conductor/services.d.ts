declare module "natlang:services" {
  export const collectionState: { observe(): Promise<import("./types.js").CollectionSnapshot> };
  export const collectionChange: {
    apply(basisId: string, mutation: import("./types.js").CollectionMutation): Promise<import("./types.js").CollectionSnapshot>;
  };
}
