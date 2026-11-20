---
description: Execute the exact approved public migration after verifying its source and preview.
uses: [reviewBrowserImport/inspectAssignedSource, reviewBrowserImport/inspectPreview, reviewBrowserImport/inspectRetainedJob, reviewBrowserImport/interpretRetainedJob]
args:
  request: BrowserImportReviewRequest
returns: BrowserImportReviewReport
---
1. Require an execute request. Call inspectAssignedSource with the assigned categories. If unusable, return use-inspector with its source observation and empty totals and progress.
2. Call inspectPreview with the assigned categories. Keep its exact totals and source evidence. Call compareApprovedPreview with the request's approvedPreview and the observed preview. If preview coverage failed or the comparison disagrees, return use-inspector with no progress and explain which confirmation is needed.
3. Call startApprovedImport with the exact preview observation. If held, report use-inspector and the source or preview check as the blocker. Return the observed totals and no progress.
4. Once started, call inspectRetainedJob for the assigned operation. If its receipt is unavailable, return observe-existing with the observed totals and empty progress. If present, call interpretRetainedJob and return its decision and exact stored, skipped, and error counts alongside the preview totals. Never start another operation.
