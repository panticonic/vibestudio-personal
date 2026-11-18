---
description: Turn a GitHub work goal and exact caller-read repository status into a scoped next step.
args:
  request: PersonalRepoRequest
returns: PersonalRepoReport
---
1. Call interpretGitWork(request.goal) to find the concrete intended operation. Call chooseAccess with that goal and operation. Ask for clarification when a remote effect is ambiguous.
2. Call assessRepo with the worktree and upstream observations supplied in request, the operation and the required access. Respect local changes and divergence before incoming/outgoing work. Distinguish an actual verified remote from one needing the owner check.
3. Call writePlan with the exact observed state and decision. Return a short ordered plan. Recommend the existing owner credential workflow when access is missing. Report intended effects as proposals, because this skill does not execute those operations.
