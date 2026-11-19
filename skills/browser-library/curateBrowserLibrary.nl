---
description: Recover and organize saved browser references in the caller's library.
args:
  request: BrowserLibraryRequest
returns: BrowserLibraryReport
---
1. Call browserLibraryState.observe for the current library.
2. For each requested action in order, call planLibraryChange using the current snapshot.
3. If the plan is null, append a held finding with null bookmarkId and the current snapshot ID.
4. Otherwise call applyLibraryChange. Append its finding and use its returned snapshot for the next action. Stop if unverified.
5. Return the ordered findings.
