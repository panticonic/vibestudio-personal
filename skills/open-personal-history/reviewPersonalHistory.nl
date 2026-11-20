---
description: Verify an operational decision or comparison against its exact charted history.
args:
  goal: string
returns: Report
budget: { maxTurns: 32 }
---
1. Use archiveTimeline.discover to read the workspace memory leads and the milestone catalog. Call chooseMilestones with the goal and that scope.
2. For every milestone selected, call inspectMilestone with the milestone, the field, and the goal. Preserve the resulting evidence and order of milestones.
3. Call reconcile with the goal and those verified findings. Return the actual findings along with the resulting comparison and action.
