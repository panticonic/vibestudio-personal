---
description: Resolve the assigned repository's onboarding action against the current owner catalog.
args:
  operationId: string
  action: '"setup" | "check"'
returns: PersonalSetupRequest
---
Call repositoryOwnerRead.resolve once with operationId and action. Return the exact projected owner request from eval.
