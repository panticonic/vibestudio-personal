---
description: Find the prospective bookmark or choose one necessary edit from the goal and live library.
args:
  goal: string
  state: ArtifactLibrary
returns: ArtifactLibraryDecision
---
1. Match the requested reference to observed title, URL and folder detail. Recover a missing reference only from a relevant observed visit. When the goal asks for an original or latest version, compare relevant visit times and require a unique match at the requested end of the timeline. Hold if the leading visits tie. Recover a bookmark under its observed visit title unless the goal asks for another title.
2. Choose one requested unfinished edit. Use the observed exact folder, bookmark ID, title and URL. A duplicate may be retired only when the user's intended surviving copy has the same URL. Keep unrelated rows and metadata.
3. When no edit remains, finish with the authoritatively identified bookmark for the requested follow-up, or null if the user requests none or a reference remains ambiguous. Report held when relevant work cannot be safely resolved and preserve any independent action the user requested.
