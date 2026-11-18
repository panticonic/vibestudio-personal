---
description: Establish the task's current planning identity and applicable start gates.
args:
  input: MissionFacilityEvidence
returns: FacilityReview | null
---
A different task is blocked / task-id-mismatch citing target then card. A conflicting revision is attention / reread-task-revision citing target then card. For a start, a cancelled card or archived project is blocked / task-closed-to-work with card ID. A Done card with a manual automation is blocked / manual-task-already-done with card ID. A recurring Done card describes its accepted prior occurrence. It can still qualify for the next admitted occurrence. An unaccepted dependency is waiting / dependencies-unaccepted with card ID. Otherwise return null.
