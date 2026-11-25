---
description: Select a unique panel and determine the next authorized collection action.
args:
  goal: string
  collection: ArtifactCollection
  library: ArtifactLibraryResult
returns: ArtifactCollectionDecision
---
Return one ArtifactCollectionDecision from the supplied collection and library state. The caller applies a returned change or link, then supplies the actual readback for another decision.

1. Resolve the requested panel or group from the observed tree, considering each parent. If identity or a required browser reference remains ambiguous, leave that dependent action held while choosing any independent unfinished action the user actually requests.
2. For a handoff, return a link decision identifying the panel and requested heading for the library's currently selected bookmark. An existing exact note needs no further link. For another necessary change, return a change decision with the exact mutation, panel and destination from the observed tree. Preserve unrelated notes, names and hierarchy in the selected mutation.
3. Return finish with held false when the supplied state establishes all authorized work. Return finish with held true when unresolved work remains and no independent requested action can be selected safely.
