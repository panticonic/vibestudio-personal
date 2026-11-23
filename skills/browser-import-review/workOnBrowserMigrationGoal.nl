---
description: Preview, execute or recover an owned browser migration and confirm a requested bookmark handoff.
args:
  goal: string
returns: OpenMigrationReport
uses: [reviewBrowserImport]
budget: { maxTurns: 20 }
---
1. Call openBrowserMigration.discover and chooseMigration(goal, catalog). Bind that exact choice and observed revision. Return unresolved if source, authority or request cannot be bound.
2. Call reviewBrowserImport with the observed request. Call openBrowserMigration.readOutcome and return that exact preview, prior approval, current receipt and retained bookmarks. Retain its actual report without changing the counts or decisions. Map use-inspector or review-retry to held when the request cannot proceed, review-preview to observed, and keep-results to imported for a completed execute and retained for existing work.
3. Call leaveMigrationHandoff only when the goal asks for an actual handoff and the review says keep-results. Return handed-off only when that stage returns its verified receipt. If an explicitly requested handoff is unavailable, return held and retain the actual import report. Call migrationResult with the actual disposition, review, native outcome evidence and delivery; return its retained import result and requested review findings. Source choice and approval previews remain internal. An observe-existing result describes retained work without dispatching again.
