---
description: Describe the next onboarding step without inventing setup progress.
args:
  request: PersonalSetupRequest
  action: PersonalSetupAction
  unknownIds: string[]
returns: string
---
Briefly explain the chosen step in the user's language. Keep unknown states unresolved. If opening a separate workspace, explain that the conversation stays here. Refer to the owner for permissions or credentials and do not request any secret.
