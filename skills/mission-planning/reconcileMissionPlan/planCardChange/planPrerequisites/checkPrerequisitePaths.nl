---
description: Check the complete prerequisite paths below a proposed set of direct dependencies.
args:
  target: MissionCard
  dependencies: string[]
  snapshot: MissionSnapshot
returns: string[]
---
Traverse prerequisite IDs from the proposed dependencies, using work and visited sets. Return ["cycle"] when any path reaches the target ID. Return ["dependency-outside-board"] when an ID is absent from the observed cards. Return [] if both checks pass throughout the traversal.
