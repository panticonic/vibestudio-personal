declare module "natlang:services" {
  export const operatorQueue: {
    observe(): Promise<import("./types.js").Queue>;
    apply(basis: string, id: string, action: import("./types.js").Action): Promise<import("./types.js").Receipt>;
  };
}
