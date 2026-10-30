---
description: Decide the next step of GitHub setup from the onboarding status and the access level the user's goal needs.
args:
  status: OnboardingStatus
  level: GitHubAccessLevel
returns: Route
---
Call collect with status and level and return its result exactly as collect gave it, from eval. collect reads the stored
credential and applies the setup rules.
