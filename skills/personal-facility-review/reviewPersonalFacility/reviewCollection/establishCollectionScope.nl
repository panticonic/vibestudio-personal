---
description: Interpret assigned panel root, traversal limit, and structural refresh evidence.
args:
  input: CollectionFacilityEvidence
returns: FacilityReview | null
---
A walk for another root is blocked / collection-root-mismatch with root then walk ID. A present target outside the root's descendant scope is blocked / panel-outside-collection with root then target ID. A reached work limit is waiting / narrow-collection-scope with walk ID. A structure review using a walk that was not refreshed after the change is waiting / refresh-after-structure-change with walk ID. Otherwise return null.
