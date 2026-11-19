---
description: Prepare the caller's Mission Control plan for review while preserving card linkage.
args:
  request: MissionPlanningRequest
returns: MissionPlanningReport
---
1. Call missionPlanningState.observe. Use this as the current planning snapshot.
2. In request order, call planCardChange for each proposal. For a held proposal, append a held finding with null cardId, its blockers, and the current observation ID. Continue with the next proposal.
3. For a concrete change call applyCardChange. Use its returned snapshot for later proposals and keep its finding. Stop the batch if the outcome is unverified.
4. Return the ordered findings.
