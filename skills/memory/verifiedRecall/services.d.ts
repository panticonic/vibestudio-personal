declare module "natlang:services" {
  export const decisionRecall: {
    search(query: string): Promise<import("./types.js").DecisionLead[]>;
  };
  export const decisionSource: {
    read(leadId: string): Promise<import("./types.js").DecisionFile | null>;
  };
}
