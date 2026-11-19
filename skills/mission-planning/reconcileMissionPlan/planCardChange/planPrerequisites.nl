---
description: Resolve proposed prerequisite cards and hold updates that would break the graph.
args:
  target: MissionCard
  requires: CardRef[]
  snapshot: MissionSnapshot
returns: MissionDecision
---
Call locateCard for each assigned prerequisite. Hold with prerequisite-not-unique when any resolution is missing or ambiguous. Preserve the requested order and collapse repeated IDs. Call checkPrerequisitePaths. Hold with its blockers when a chain returns to the target or leaves the observed board. If the target is active, require every direct prerequisite to be done, and hold with active-dependency otherwise. Return the exact requested IDs and the current revision.
