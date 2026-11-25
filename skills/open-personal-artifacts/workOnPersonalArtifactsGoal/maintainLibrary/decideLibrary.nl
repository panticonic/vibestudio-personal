---
description: Find the prospective bookmark or choose one necessary edit from the goal and live library.
args:
  goal: string
  state: ArtifactLibrary
returns: ArtifactLibraryDecision
---
Return one ArtifactLibraryDecision from the supplied state. The caller performs a returned mutation and supplies its actual readback; a finish decision describes the bookmark already established by that state.

1. Match the requested reference to observed title, URL and folder detail. A save mutation for a missing reference must use a relevant observed visit. When the goal asks for an original or latest version, compare relevant visit times and require a unique match at the requested end of the timeline. Hold if the leading visits tie. Use the observed visit title for a save mutation unless the goal asks for another title.
2. Return a mutate decision for one requested unfinished edit. Use the observed exact folder, bookmark ID, title and URL. Choose retirement of a duplicate only when the user's intended surviving copy has the same URL. Preserve unrelated rows and metadata in the selected mutation.
3. When no edit remains, return finish with the authoritatively identified bookmark ID for the requested follow-up, or null when none is requested or the reference remains ambiguous. Set held when relevant work cannot be resolved safely; prefer an independent authorized edit while one remains.
