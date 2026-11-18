---
description: Verify new parent/order or evaluate current content scope and runtime attribution.
args:
  input: CollectionFacilityEvidence
returns: FacilityReview
---
1. For structure, a missing readback is waiting / structure-unobserved with walk ID. A differing requested parent or sibling is attention / wrong-parent-or-order. Matching structure is ready / structure-confirmed. Cite the readback ID for the latter two cases.
2. For content, a missing target is waiting / panel-unobserved with root ID. Runtime access requires a context matching the root, creator ancestry through the root's operation, or a matching approved context grant. An unrelated moved panel without qualifying access is waiting / runtime-approval-required with target ID. This leaves structural placement unchanged.
3. If a reachable panel's leased runtime differs from its observed runtime return attention / replace-stale-cdp-lease citing the CDP receipt. Otherwise ready / runtime-scope-observed with target ID.
