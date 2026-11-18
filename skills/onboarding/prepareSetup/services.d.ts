import type { SetupObservation } from "./types.js";
declare module "natlang:services" {
  export const onboardingRead: { inspect(): Promise<SetupObservation> };
}
