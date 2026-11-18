---
description: Route a Personal workspace goal across memory, onboarding and repository work.
args:
  request: PersonalWorkflowRequest
returns: PersonalWorkflowReport
budget: {maxTurns: 24}
---
1. Determine which assigned work serves request.goal. Choose an order that lets any historical context or setup uncertainty be exposed before recommending downstream effects. Use only the supplied typed input for the chosen skill.
2. Call recallWorkspace for source history, routeSetup for a capability owner or refresh, and planRepositoryWork for repository status and work. Retain actual reports in order. If different reports describe past and current state, use current owner status for current state and retain the relevant historical context.
3. Return unresolved questions raised by the actual work, including when there is no confirmed source or an owner must verify state. Do not claim changes, external access, a completed setup, or publication.
