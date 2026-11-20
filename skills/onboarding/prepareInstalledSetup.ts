import { composeOnboardingCapabilities } from "./snapshot.js";
import { projectSetupRoute } from "./routing.js";
import type { SetupObservation } from "./prepareSetup/types.js";

/** Project the product's real owner and catalog state without exposing its credentials. */
export async function inspectInstalledSetup(
  ids: readonly string[],
  interaction: unknown,
): Promise<Omit<SetupObservation, "receipt">> {
  const { catalog, snapshot } = await composeOnboardingCapabilities();
  const state = new Map(snapshot.map((entry) => [entry.id, entry.state]));
  const rows = ids.map((id) => {
    const observed = state.get(id);
    return {
      id,
      state: observed ?? "unknown",
      observed: observed !== undefined,
    } as const;
  });
  return { rows, route: projectSetupRoute(interaction, catalog) };
}
