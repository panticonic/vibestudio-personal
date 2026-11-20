---
description: Select a unique panel and determine the next authorized collection action.
args:
  goal: string
  collection: ArtifactCollection
  library: ArtifactLibraryResult
returns: ArtifactCollectionDecision
---
1. Resolve the requested panel or group from the live tree, considering each parent. If identity or a required browser reference remains ambiguous, hold the dependent action. Complete independent actions the user actually requests.
2. A handoff links the currently selected bookmark under the requested heading. Recognize an existing exact note and leave it alone. For other changes, choose the matching panel and destination from the observed tree. Preserve existing unrelated notes, names and hierarchy.
3. Finish when all authorized work is verified, or hold an unresolved part without guessing.
