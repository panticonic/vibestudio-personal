---
description: Confirm a bounded Explorer observation has an authorized scope and prior expectation, then classify it.
args:
  input: ExplorerFacilityEvidence
returns: FacilityReview
---
1. Call validateExplorerProof. Return its finding when non-null.
2. Call classifyExplorerProof to interpret the observed comparison.
