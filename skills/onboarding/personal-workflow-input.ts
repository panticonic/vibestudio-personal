import type { OnboardingCapabilitiesOverview } from "./snapshot.js";
import type { ResolvedOnboardingSelection } from "./routing.js";

/** The capability owner's exact readback, projected without private state or authorization tokens. */
export function personalSetupWorkflowInput(
  goal: string,
  origin: "welcome" | "selection" | "refresh" | "workspace-creation",
  overview: OnboardingCapabilitiesOverview,
  resolved?: ResolvedOnboardingSelection,
) {
  const byId = new Map(overview.snapshot.map((row) => [row.id, row]));
  const capabilities = overview.catalog.map((entry) => ({
    id: entry.id,
    label: entry.title,
    owner: entry.ownerSkillPath ?? entry.scope,
    state: byId.get(entry.id)?.state ?? ("unknown" as const),
  }));
  const via = resolved?.target.via;
  const selection =
    resolved &&
    (via === "owner-skill" ||
      via === "model-settings" ||
      via === "conversation")
      ? {
          id: `${resolved.capability.id}/${resolved.action}`,
          capabilityId: resolved.capability.id,
          action: resolved.action,
          via,
          ownerSkillPath: resolved.ownerSkillPath ?? null,
        }
      : null;
  return { goal, origin, selection, capabilities };
}
