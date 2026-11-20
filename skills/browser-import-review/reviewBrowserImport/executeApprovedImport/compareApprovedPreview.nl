---
description: Decide whether the fresh aggregate preview still matches the user's approval.
args:
  approved: ImportPreviewObservation
  observed: ImportPreviewObservation
returns: boolean
---
Require both to be previewed and the warning counts to be equal. Compare totals by exact category and count, independent of category order. Reject duplicate categories, missing categories, and additional categories. Return true only if they agree.
