---
description: Review a scoped browser migration snapshot, inspector, or imported-tab destination.
args:
  input: BrowserFacilityEvidence
returns: FacilityReview
---
1. For snapshot, call chooseImportLane. Return its non-null scope finding, otherwise call interpretImport.
2. For inspector or tabs call reviewImportSurface.
