declare module "natlang:services" {
  export const missionPlanningState: { observe(): Promise<import("./types.js").MissionSnapshot> };
  export const missionPlanningChange: {
    apply(snapshotId: string, changes: import("./types.js").MissionChanges): Promise<import("./types.js").MissionSnapshot>;
  };
}
