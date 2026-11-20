---
description: Decide whether the repository plan needs a GitHub onboarding handoff.
readout: decision
args:
  repository: PersonalRepoReport
returns: RepositoryOwnerAction
---
Use setup for request-access. Use check for check-access or verify-remote. Use skip for every other decision. Reviewing local changes and reconciling history do not require a credential handoff.
