---
description: Plan one authoritative card change with prerequisites intact.
args:
  proposal: MissionProposal
  snapshot: MissionSnapshot
returns: MissionDecision
---
1. Hold with blocker incomplete-board when the observation is incomplete. Call locateCard for the target. Hold with blocker target-not-unique when it returns null.
2. For prerequisites, call planPrerequisites and return its decision.
3. For relocate, call planRelocation and return its decision.
4. For ready, call assessReadiness and return its decision.
