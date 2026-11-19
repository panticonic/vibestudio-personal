---
description: Verify the intended bookmark effect from before and after browser-store observations.
args:
  before: BrowserLibrarySnapshot
  after: BrowserLibrarySnapshot
  mutation: LibraryMutation
returns: LibraryFinding
---
Cite both snapshot IDs. Require a new snapshot. For retirement call verifyRetiredCopy. For other mutations call verifySavedReference. If the resulting bookmark ID is null, report unverified. Otherwise report verified citing that ID.
