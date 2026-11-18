---
description: Select a reversible next step using actual worktree, upstream and access state.
args:
  request: PersonalRepoRequest
  operation: PersonalRepoAction
  access: PersonalAccess
  ambiguous: boolean
returns: PersonalRepoDecision
---
Return clarify if ambiguous. Inspect locally when the user asks for status or diff. Prepare local work for edit-local. For pull or push, review local changes first if the tree is dirty or unknown. Reconcile history if histories diverge, or if a push would go to a branch that already has unseen upstream changes. For work using a remote, check-access when request.availableAccess is unknown. Use request-access when the required access is absent from request.availableAccess. That list comes from the owner's scope check. Require verify-remote unless that remote is explicitly verified. Otherwise return plan-requested-effect. Respect existing credentials and avoid automatic scope escalation.
