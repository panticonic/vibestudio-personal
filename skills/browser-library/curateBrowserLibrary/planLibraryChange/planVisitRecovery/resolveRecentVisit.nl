---
description: Identify the single latest visited URL matching a literal title or URL fragment.
args:
  query: string
  visits: LibraryVisit[]
returns: LibraryVisit | null
---
Trim the query and compare case-insensitively against the visit title and URL. Among matching rows, take the largest lastVisitTime. If those newest rows disagree on the URL or title, return null. Otherwise return the newest matching visit, or null if nothing matched.
