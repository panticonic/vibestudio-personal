---
description: Verify an exact panel tree edit against its previous and refreshed state.
args:
  before: CollectionSnapshot
  after: CollectionSnapshot
  mutation: CollectionMutation
returns: CollectionFinding
---
Cite the before and after IDs. An incomplete snapshot or changed root is unverified. For rename and note, require the target panel to remain in the tree and its requested title or note to be exact, and cite that panel ID. For group and move, delegate to verifyPlacement. Return unverified with null panelId when verification fails.
