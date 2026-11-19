---
description: Decide whether an inbox card can enter the ready queue without starting an execution.
args:
  target: MissionCard
  snapshot: MissionSnapshot
returns: MissionDecision
---
Require status inbox, or hold with card-not-in-inbox. For every direct dependency identify the exact card ID in the snapshot. If any dependency is missing or its status differs from done, hold with those dependency IDs as blockers. Otherwise return a ready change with the observed card ID and revision.
