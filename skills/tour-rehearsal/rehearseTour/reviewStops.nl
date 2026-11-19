---
description: Visit and verify the planned tour stops in order.
args:
  operationId: string
  plan: TourPlan
  sceneCount: number
returns: TourVisit[]
---
For each stop in sequence call tourRehearsal.visit with operationId, stop.scene.id and stop.notes. Call verifyTourStop with that exact frame and assigned stop. Append the stop and readback unchanged. Stop immediately if a readback mismatched. Return the ordered visits.
