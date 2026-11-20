---
description: Choose the next scoped action or recognition of a held or already correct target.
args:
  goal: string
  queue: Queue
  findings: Finding[]
returns: Plan
---
1. Resolve each requested name, team, condition and dependency against the current live queue. Respect the user's scope and leave similarly named monitors outside that scope alone. Report any explicitly requested missing target using its name and a null ID.
2. For read-only review, record the observed state as unchanged. For requested controls, hold if a different revision replaced the reviewed definition, the action is unpermitted, a requirement remains paused or uncertain, or the user required every review to match and any is missing. A suitable target already in the requested state is unchanged. Never operate a monitor after its finding is recorded.
3. When a required dependency is itself requested, handle it before its consumer. An unresolved target need not block independent requested work. Once all requested targets are recorded, report complete if all targets were verified, partial if some were verified and others remain held or uncertain, or held if none were verified.
