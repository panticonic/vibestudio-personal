---
description: Resolve the user's local reference from current browser data and perform scoped curation.
args:
  goal: string
returns: ArtifactLibraryResult
budget: { maxTurns: 28 }
---
1. Observe the library. Call decideLibrary with the goal and current state.
2. When it returns a mutation, apply it with the current snapshot ID and retain the actual returned state. A changed result requires a fresh decision on that state. On held, return held and the returned state, with no selected bookmark.
3. Repeat only while the goal still requires an authorized change. When finished, return the chosen bookmark ID, held flag and final observed state.
