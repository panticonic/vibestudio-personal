---
description: Put the exact requested retained bookmark in the correct owned collection panel.
args:
  goal: string
  review: BrowserImportReviewReport
returns: 'MigrationDelivery | null'
---
1. Call openBrowserMigration.inspectHandoff with the actual import report. If the verified retained view is unavailable, return null.
2. Call selectHandoff with the goal and view. Bind its exact bookmark and panel to the observed revision with openBrowserMigration.stageHandoff. Return the actual staged and verified receipt.
