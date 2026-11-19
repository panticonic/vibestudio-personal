---
description: Confirm a saved or edited record without confusing it with a matching neighbor.
args:
  before: BrowserLibrarySnapshot
  after: BrowserLibrarySnapshot
  mutation: LibraryMutation
returns: number | null
---
1. For save, require exactly one new record with the requested folder, title and URL. Return its new ID.
2. For rename or file, look up the same original ID in both observations. Require the URL to be preserved. For rename require the requested title in the original folder. For file require the requested folder with the original title. Return that ID only on a full match.
3. For missing or ambiguous evidence return null.
