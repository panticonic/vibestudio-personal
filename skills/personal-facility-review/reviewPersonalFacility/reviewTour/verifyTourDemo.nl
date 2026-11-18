---
description: Verify one Tour demo from actual authorized readback instead of local UI state.
args:
  input: TourFacilityEvidence
returns: FacilityReview
---
1. A missing receipt is waiting / demo-readback-missing with scene ID. Use receipt ID below.
2. Protected read: another or simulated receiver is blocked / missing-declared-protected-read. Pending is waiting / demo-approval-pending; denied is blocked / demo-approval-denied. A grant from the declared receiver is ready / demo-protected-read-confirmed.
3. App preview: a wrong context, changed main, or changed bookmark data is blocked / preview-boundary-violated. Missing local commit or child rebuild is waiting / preview-not-verified. Otherwise ready / local-preview-verified.
4. Manual run: recurrence or nextRun means attention / unexpected-tour-recurrence. Otherwise an incomplete run is waiting / manual-run-incomplete, or a completed manual run is ready / manual-run-confirmed.
5. Template review: creation without source review is blocked / template-review-bypassed. Otherwise ready / source-review-prefilled if prefilled, or waiting / template-source-unobserved.
