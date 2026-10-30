/** Name the cause, then look up its documented steps. */
import cause from "./cause.nl";
import steps from "./steps.js";
import type { NextStep } from "../types.js";

export default async function collect(failure: string): Promise<NextStep> {
  return steps(await cause(failure));
}
