---
description: Prepare an onboarding response from current installed owner state and the assigned action.
args:
  request: SetupRequest
returns: SetupPlan
---
1. Call observeSetup(). Preserve its exact receipt and rows.
2. Call reviewOwnerState on those rows. Preserve its unknown and needsVerification lists.
3. Call reviewSelection with request.intent and the actual observed route. Return its status. Preserve the exact route only for route-owner and route-client. All other statuses carry a null route. For workspace creation, return the separate-workspace status: the shell owns opening that workspace, and this plan leaves the current conversation in place.
