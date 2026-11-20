---
description: Read the exact milestone and ground the decision in the relevant committed records.
args:
  milestone: Milestone
  field: string
  goal: string
returns: Finding
budget: { maxTurns: 26 }
---
1. List the actual paths at the milestone's event using archiveTimeline.list. Use chooseDocuments with the field, goal, and listed paths to choose the records to inspect, including plausible competing and withdrawal records. Read them using archiveTimeline.read at this same event.
2. Call assessRecords with the actual files, milestone, field and goal. Use its status and citations verbatim.
