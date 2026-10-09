import { callMain, openPanel, PanelOperationError } from "@workspace/runtime";
import type { PanelRuntimeFailure } from "@vibestudio/shared/panel/observation";
import {
  resolveOnboardingSelection,
  type OnboardingInteraction,
  type ResolvedOnboardingSelection,
} from "./routing";
import type { ShellNavigationTarget } from "./catalog";
import { readInstalledOnboardingCatalog } from "./snapshot";
import type { ShellSurfaceDescriptor } from "@vibestudio/shared/shellSurface";

export interface OnboardingExecutionDependencies {
  openWorkspacePanel: (source: string) => Promise<{
    id: string;
    readiness?: "ready" | "unconfirmed";
  }>;
  openShellSurface: (
    target: ShellNavigationTarget | Extract<ShellSurfaceDescriptor, { kind: "about" }>
  ) => Promise<void>;
  readCatalog?: typeof readInstalledOnboardingCatalog;
}

export interface OnboardingExecutionResult {
  handled: boolean;
  target: ResolvedOnboardingSelection["target"];
  panelId?: string;
  readiness?: "ready" | "unconfirmed";
  failure?: PanelRuntimeFailure;
  ownerSkillPath?: string;
}

const defaultDependencies: OnboardingExecutionDependencies = {
  openWorkspacePanel: async (source) => {
    const panel = await openPanel(source, { focus: true });
    return { id: panel.id, readiness: "ready" as const };
  },
  openShellSurface: (target) => callMain<void>("app.openShellSurface", target),
  readCatalog: readInstalledOnboardingCatalog,
};

async function openNavigationPanel(
  source: string,
  target: ResolvedOnboardingSelection["target"],
  dependencies: OnboardingExecutionDependencies
): Promise<OnboardingExecutionResult> {
  try {
    const panel = await dependencies.openWorkspacePanel(source);
    return {
      handled: true,
      target,
      panelId: panel.id,
      readiness: panel.readiness ?? "ready",
    };
  } catch (error) {
    if (error instanceof PanelOperationError && error.failure.provenance.panelId) {
      return {
        handled: true,
        target,
        panelId: error.failure.provenance.panelId,
        readiness: "unconfirmed",
        failure: error.failure,
      };
    }
    throw error;
  }
}

/**
 * Execute only routes owned by the client: About pages, workspace panels, and
 * shell surfaces. SetupHub calls this from the user's click, which is the
 * authority for that navigation. Owner-skill, model-settings, and
 * conversational routes come back unhandled; SetupHub sends them to the agent
 * so their domain workflows remain authoritative.
 */
export async function executeOnboardingSelection(
  interaction: OnboardingInteraction,
  dependencies: OnboardingExecutionDependencies = defaultDependencies
): Promise<OnboardingExecutionResult> {
  const catalog = await (dependencies.readCatalog ?? readInstalledOnboardingCatalog)();
  const route = resolveOnboardingSelection(interaction, catalog);
  if (route.target.via === "about-page") {
    await dependencies.openShellSurface({ kind: "about", page: route.target.page });
    return { handled: true, target: route.target };
  }
  if (route.target.via === "panel") {
    return openNavigationPanel(route.target.path, route.target, dependencies);
  }
  if (route.target.via === "shell-navigation") {
    await dependencies.openShellSurface(route.target.target);
    return { handled: true, target: route.target };
  }
  return {
    handled: false,
    target: route.target,
    ...(route.ownerSkillPath ? { ownerSkillPath: route.ownerSkillPath } : {}),
  };
}
