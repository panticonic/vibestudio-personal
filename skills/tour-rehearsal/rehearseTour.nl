---
description: Rehearse a tour on the assigned live panel and report verified scene and presenter notes readbacks.
args:
  request: TourRehearsalRequest
returns: TourRehearsalReport
---
1. Call tourRehearsal.observe with the assigned operation ID. Call planRehearsal with request and the observed start.
2. If any topic is unmatched or the plan is empty, return held with the original start and plan, no visits and null restoration.
3. Call reviewStops with the assigned operation ID, the plan and the deck length. This applies each stop and verifies its readback.
4. If request.restore and there were visits, call tourRehearsal.restore with the assigned operation ID, then verifyRestoration with the opening frame and restored frame. Otherwise use null restoration.
5. Return view-mismatch if a readback or restoration mismatched. Otherwise return rehearsed. Preserve the exact start, plan, visits and restoration.
