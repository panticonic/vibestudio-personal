---
description: Apply one revision-bound planning change and verify the stored card.
args:
  before: MissionSnapshot
  changes: MissionChanges
returns: MissionPlanStep
---
Call missionPlanningChange.apply with the observation ID and exactly the proposed changes. If the service rejects the write, return the old snapshot with an unverified finding citing that ID and blocker write-refused. Otherwise call verifyCardChange on both observations and return its finding and the new snapshot.
