---
description: Resolve one exact saved reference in the requested bookmark folder.
args:
  reference: BookmarkRef
  snapshot: BrowserLibrarySnapshot
returns: LibraryBookmark | null
---
Require a folder in availableFolders and at least one of title or URL. Consider only records in that folder. Match the URL exactly when provided, and match a supplied title case-insensitively after trimming. Return the record when the matches contain exactly one ID. Otherwise return null.
