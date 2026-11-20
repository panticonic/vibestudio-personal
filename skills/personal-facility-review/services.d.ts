declare module "natlang:services" {
  export const missionFacilityRead: {
    inspect(operationId: string): Promise<import("./types.js").MissionFacilityEvidence>;
  };
}
