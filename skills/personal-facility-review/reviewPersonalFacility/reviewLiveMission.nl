---
description: Review whether an assigned live Mission Control card can move toward execution.
uses: [reviewPersonalFacility/reviewMission]
args:
  request: {kind: "mission-live", goal: string, operationId: string}
returns: FacilityReview
---
Call readMissionCard with request.operationId. Give the exact receipt to reviewMission and return its finding unchanged. Keep revisions, prerequisite state, and executor admission distinct. Do not change the task or start an automation.
