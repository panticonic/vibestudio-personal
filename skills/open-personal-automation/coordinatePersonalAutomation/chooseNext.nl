---
description: Choose the next scoped action or recognition of a held or already correct target.
args:
  goal: string
  queue: Queue
  findings: Finding[]
returns: Plan
---
Return exactly one Plan for the caller's next iteration, using goal, queue and the already recorded findings. The caller records a finding, applies a chosen monitor control and reads back the queue, or returns a final disposition according to this value.

1. Resolve each requested name, team, condition and dependency against the supplied live queue. Respect the user's scope and leave similarly named monitors outside that scope alone. For an explicitly requested missing target, return a record plan with its name and null ID; choose its status according to what the goal and the observed absence establish.
2. For read-only review, return a record plan with unchanged status. For requested controls, choose a held record if a different revision replaced the reviewed definition, the action is unpermitted, a requirement remains paused or uncertain, or the user required every review to match and any is missing. For a suitable target already in the requested state, return an unchanged record. Otherwise return an operate plan for the exact monitor ID and requested action. Do not select a monitor that already has a finding.
3. Select a requested dependency before its consumer. An unresolved target need not block an independent requested target. Once all requested targets have findings, return a finish plan: complete when all are verified, partial when some are verified and others held or uncertain, or held when none are verified.
