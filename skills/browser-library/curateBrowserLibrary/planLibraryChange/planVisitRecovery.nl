---
description: Recover the most recent unambiguous visited URL into an assigned bookmark folder.
args:
  action: BrowserLibraryAction
  snapshot: BrowserLibrarySnapshot
returns: LibraryMutation | null
---
1. Require a recover action, nonempty trimmed query and destination in availableFolders.
2. Call resolveRecentVisit with the query and observations. Return null without a unique recent result.
3. Hold if the same URL is already in the requested folder. Use the requested title when supplied, or the observed visit title. Require a nonempty title and return a save mutation with the exact URL.
