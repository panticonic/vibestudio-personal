---
description: Identify one browser-library change that preserves valid saved references.
args:
  action: BrowserLibraryAction
  snapshot: BrowserLibrarySnapshot
returns: LibraryMutation | null
---
1. For a recovery request, call planVisitRecovery.
2. For other requests, call findBookmark for action.target. Return null unless exactly one record matches.
3. For rename, return the original ID and requested title.
4. For filing, require a different available folder with no bookmark of the same URL. Return the original ID and requested folder.
5. For retirement, call confirmRetainedReference. Return a retirement mutation with the target and retained IDs only if it confirms a distinct matching copy.
