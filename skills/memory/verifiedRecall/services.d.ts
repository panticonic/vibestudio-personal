import type { DecisionFile, DecisionLead } from "./types.js";
declare module "natlang:services" {
  export const decisionRecall: {
    search(query: string): Promise<DecisionLead[]>;
  };
  export const decisionSource: {
    read(leadId: string): Promise<DecisionFile | null>;
  };
}
