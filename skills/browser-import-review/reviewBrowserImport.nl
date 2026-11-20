---
description: Review, execute, or recover the assigned browser migration.
args:
  request: BrowserImportReviewRequest
returns: BrowserImportReviewReport
---
For execute, delegate the complete request to executeApprovedImport and return its report.

1. For preview, call inspectAssignedSource(request.categories). If it is unusable, return use-inspector with its exact observation and report which prerequisite is missing. Otherwise call inspectPreview(request.categories). Return its decision, exact totals and findings with the source observation. Progress is empty in either case.
2. For recover, call inspectRetainedJob. If no assigned job is visible, return use-inspector with empty progress and explain that the receipt is unavailable. Otherwise call interpretRetainedJob with that snapshot. Keep the exact recorded progress in its original order. Totals are empty.
3. For a recovery decision other than review-retry, return the decision without reading the source. For review-retry, call inspectAssignedSource(request.categories) to confirm the same original source is still usable. Keep review-retry only if that check passes. Otherwise use-inspector and explain the blocker alongside the existing progress.
