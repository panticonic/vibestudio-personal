---
description: Review the captured inspector lifecycle or imported-tab destination.
args:
  input: BrowserFacilityEvidence
returns: FacilityReview
---
For inspector, a temporary tool still open with no active user migration is attention / retire-temporary-inspector. A user migration with an open inspector is ready / keep-user-inspector. Otherwise ready / inspector-closed. Cite inspector ID.
For tabs, the approved default is new-root; caller is valid only when explicitly requested. An unrequested caller attachment is attention / tab-destination-mismatch. Missing grouping is attention / source-window-groups-missing. Otherwise ready / tabs-at-approved-destination. Cite the tabs receipt.
