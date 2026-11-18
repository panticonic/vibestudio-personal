---
description: Choose the plan status for this intent and its actual selection metadata.
args:
  intent: SetupIntent
  route: SetupRoute | null
returns: PlanStatus
---
Call chooseSurface(intent, route). A selection only follows a route the product resolved. Never infer one from goal wording, capability labels, or state.
