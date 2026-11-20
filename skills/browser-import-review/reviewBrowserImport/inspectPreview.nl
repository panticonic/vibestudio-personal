---
description: Reconcile the assigned public preview totals to the requested categories.
args:
  requested: PublicImportCategory[]
returns: "{ next: BrowserImportNext; totals: ImportTotal[]; findings: string[] }"
---
Call browserImportPreview.observe. If it reports source-changed, return use-inspector with no totals and explain why a fresh selection is needed. Otherwise retain its exact totals in order. Return review-preview only when there is exactly one total for each requested category and no extra totals. A zero total is valid coverage. For missing or unexpected categories return use-inspector and describe the coverage mismatch. Report the number of preview warnings so the caller can review them in the inspector without filling in unobserved counts.
