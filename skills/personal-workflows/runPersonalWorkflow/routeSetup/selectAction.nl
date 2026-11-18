---
description: Choose one next step from the setup owner's actual route or the overview lifecycle.
args:
  request: PersonalSetupRequest
  capabilityIds: string[]
returns:
  {action: PersonalSetupAction; routeId: string | null; workspaceScope: "current" | "separate"}
---
For an exact selection matching a known relevant capability, choose follow-owner-route with the original route ID. If the selection is missing or inconsistent, clarify. For welcome choose open-overview. For refresh choose refresh-overview. For workspace creation choose open-workspace-chooser and workspaceScope separate. Other actions stay in the current workspace. Use null for routeId unless following a real route.
