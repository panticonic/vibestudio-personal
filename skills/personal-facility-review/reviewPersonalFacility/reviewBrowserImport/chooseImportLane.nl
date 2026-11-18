---
description: Validate authorized source selection and the appropriate public or sealed import receipt.
args:
  input: BrowserFacilityEvidence
returns: FacilityReview | null
---
Use snapshot detail. Missing user selection is waiting / source-selection-unapproved with target ID. Settings are unsupported and mean blocked / category-unsupported with target ID. Cookies, passwords and form fill use a sealed status. If the request mixes these with public categories, return attention / separate-import-lanes with target ID. If a present receipt identifies another host, source or operation ID, return blocked / import-receipt-mismatch with target then receipt. A present public receipt for protected categories or sealed receipt for public categories is blocked / import-lane-mismatch with target then receipt. Otherwise defer lifecycle interpretation.
