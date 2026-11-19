---
description: Apply the authorized browser-library mutation and verify the persisted outcome.
args:
  before: BrowserLibrarySnapshot
  mutation: LibraryMutation
returns: LibraryStep
---
Call browserLibraryChange.apply with before.id and mutation. If the service fails, return an unverified finding with null bookmarkId and the before ID and stop. Otherwise call verifyLibraryChange with both snapshots and return the finding and after snapshot.
