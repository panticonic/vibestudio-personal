import type { MissionChanges, MissionSnapshot } from "./types.js";

declare module "natlang:services" {
  export const missionPlanningState: { observe(): Promise<MissionSnapshot> };
  export const missionPlanningChange: {
    apply(snapshotId: string, changes: MissionChanges): Promise<MissionSnapshot>;
  };
}
