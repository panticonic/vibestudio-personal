---
description: Assign the request to its original owner while keeping distinct setup and navigation intents.
args:
  intent: SetupIntent
  route: SetupRoute | null
returns: PlanStatus
---
For welcome return overview, for refresh return refresh-overview, and for workspace-creation return separate-workspace. For selection without a route return invalid-selection. Otherwise owner-skill, model-settings and conversation give route-owner. About-page, panel and shell-navigation give route-client.
