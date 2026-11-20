import type { Action, Queue, Receipt } from "./types.js";
declare module "natlang:services" {
  export const operatorQueue: {
    observe(): Promise<Queue>;
    apply(basis: string, id: string, action: Action): Promise<Receipt>;
  };
}
