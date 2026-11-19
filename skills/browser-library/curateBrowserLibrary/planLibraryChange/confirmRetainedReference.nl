---
description: Confirm a distinct saved copy before retiring a duplicate bookmark.
args:
  source: LibraryBookmark
  keep: BookmarkRef
  snapshot: BrowserLibrarySnapshot
returns: LibraryBookmark | null
---
Call findBookmark on keep. Require a unique record with a different ID and the exact same URL as source. Return that record or null.
