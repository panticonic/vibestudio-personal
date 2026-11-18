---
description: Interpret a task move, cancellation or archive using exact planning and Missions evidence.
args:
  input: MissionFacilityEvidence
returns: FacilityReview
---
For move, different task IDs before and after or a missing execution link gives attention / moved-task-identity-lost. Otherwise ready / move-preserved-identity. Cite the move receipt.
For execution, a missing canonical receipt is waiting / canonical-run-unobserved with card ID. A receipt for another automation is blocked / canonical-run-mismatch with card then receipt. For a cancel, a joined cancelled execution is ready / cancellation-joined, otherwise attention / cancellation-not-joined. For archive, admission, preparing, running or enabled recurrence means waiting / execution-still-active, otherwise ready / execution-drained. For other matched readback return ready / canonical-run-observed. Cite the receipt for attributed execution findings.
