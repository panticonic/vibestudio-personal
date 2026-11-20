---
description: Choose the next recovery action from the observed import phase and progress.
args:
  job: RetainedImportObservation
returns: "{ next: BrowserImportNext; findings: string[] }"
---
1. While phase is queued, discovering, copying, reading, decrypting, normalizing, storing, or reconciling, return observe-existing. The same job may still update its progress.
2. For complete, return keep-results. For cancelled, also return keep-results and respect the cancellation.
3. For failed or partial, return review-retry only when the receipt says it is resumable. Otherwise return use-inspector.
4. Identify any already stored batches and errors from the exact reported counters. Treat skipped items and errors separately. Review-retry is a recommendation to recheck the original source before retrying.
