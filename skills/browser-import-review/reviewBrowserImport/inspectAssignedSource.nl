---
description: Check that the caller's selected source can supply every requested category.
args:
  requested: PublicImportCategory[]
returns: "{ observation: ImportSourceObservation; usable: boolean; findings: string[] }"
---
Call browserImportSource.observe. Return the exact observation. It is usable only when state is available, requested is non-empty, and every requested category appears in observation.categories. Identify the unavailable prerequisite or missing categories.
