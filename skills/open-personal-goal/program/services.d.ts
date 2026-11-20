declare module "natlang:services" {
  export const missionGoalBoard: { observe(): Promise<import("./types.js").BoardSnapshot> };
  export const missionGoalChange: {
    apply(snapshotId: string, change: import("./types.js").BoardChange): Promise<import("./types.js").ChangeResult>;
  };
  export const missionGoalHandoff: {
    stage(snapshotId: string, cardIds: string[]): Promise<import("./types.js").HandoffReceipt>;
  };
}
