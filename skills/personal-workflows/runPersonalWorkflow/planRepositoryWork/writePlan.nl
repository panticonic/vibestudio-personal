---
description: Explain the repository's actual state and describe the concrete next steps.
args:
  request: PersonalRepoRequest
  operation: PersonalRepoAction
  decision: PersonalRepoDecision
returns:
  {facts: string[]; next: string[]}
---
Use only observed state and explicit requested intent. Include the relevant worktree, upstream, or verified-remote facts without guessing. State specific reversible next steps in order. For divergence describe inspection and reconciliation without discarding work. For access or remote verification point to the existing credential owner surface. Never report a remote effect as completed.
