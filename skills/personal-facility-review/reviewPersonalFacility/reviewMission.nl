---
description: Review Mission Control planning receipts alongside canonical executor observations.
args:
  input: MissionFacilityEvidence
returns: FacilityReview
---
1. Call establishMissionCard. Return its finding if task identity, revision, or card gates are disputed.
2. Call inspectMissionBoundary for a move or execution check. For a matching revision review return ready / task-revision-current with card ID.
