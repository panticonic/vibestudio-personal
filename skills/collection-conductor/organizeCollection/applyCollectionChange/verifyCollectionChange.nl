---
description: Verify an exact panel tree edit against its previous and refreshed state.
args:
  before: CollectionSnapshot
  after: CollectionSnapshot
  mutation: CollectionMutation
returns: CollectionFinding
---
Cite the before and after IDs. An incomplete snapshot or changed root is unverified. For rename and note, call verifyFieldChange with the original inputs. A true result gives verified with the mutation's panel ID. For group and move, delegate to verifyPlacement. Return unverified with null panelId when verification fails.
