declare module "natlang:services" {
  export const onboardingRead: { inspect(): Promise<import("./types.js").SetupObservation> };
}
