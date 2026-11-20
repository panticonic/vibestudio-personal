---
description: Plan the next safe step on the assigned Personal repository using current worktree and onboarding evidence.
uses: [runPersonalWorkflow/planRepositoryWork, runPersonalWorkflow/routeSetup]
args:
  request: RepositoryResumeInput
returns: RepositoryResumeReport
---
1. Read the exact repository assigned to request.operationId using readRepository. Give its observation to planRepositoryWork.
2. Call chooseOwnerAction with the repository plan. If it returns skip, return the plan with owner null.
3. Otherwise call readOwnerRoute with the same operationId and the chosen action. Give that exact input to routeSetup. Return the repository and owner reports. The task ends at the handoff.
