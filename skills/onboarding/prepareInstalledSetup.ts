import { composeOnboardingCapabilities } from "./snapshot.js";
import { resolveOnboardingSelection } from "./routing.js";
import type { SetupObservation, SetupRoute } from "./prepareSetup/types.js";

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
  if (interaction === null) return { rows, route: null };
  let resolved;
  try {
    resolved = resolveOnboardingSelection(interaction, catalog);
  } catch {
    return { rows, route: null };
  }
  const { action, capability, target } = resolved;
  const destination =
    target.via === "owner-skill"
      ? (resolved.ownerSkillPath ?? null)
      : target.via === "about-page"
        ? `about/${target.page}`
        : target.via === "panel"
          ? target.path
          : target.via === "shell-navigation" &&
              target.target.kind === "settings"
            ? `settings/${target.target.section}`
            : target.via === "shell-navigation"
              ? target.target.kind
              : null;
  const route: SetupRoute = {
    capabilityId: capability.id,
    action,
    via: target.via,
    destination,
  };
  return { rows, route };
}
