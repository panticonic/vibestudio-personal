---
description: Explain onboarding state and follow the caller's authoritative owner route.
args:
  request: PersonalSetupRequest
returns: PersonalSetupReport
---
1. Call assessSetup(request). Use only the actual state returned by owners. An unavailable or unread row does not tell you what the user did or whether credentials are valid.
2. Call selectAction with request and the capability IDs. For an authoritative selection carry the exact route ID returned by the product. A request to create a separate workspace belongs to the shell-owned chooser. Respect the current conversation's workspace.
3. Call explainNext with the actual route and unknown rows. Return its explanation together with the selected action and source IDs. Never ask for credentials in chat or assign completion counts.
