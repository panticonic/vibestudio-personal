---
description: Check that the retired record is absent and the retained exact copy survives.
args:
  before: BrowserLibrarySnapshot
  after: BrowserLibrarySnapshot
  mutation: LibraryMutation
returns: number | null
---
Require a retirement mutation. Find the two distinct original IDs and require their URLs to match. Require that the retired ID is absent after the operation and that the retained record has exactly the original ID, folder, title and URL. Return the retained ID only when all checks pass.
