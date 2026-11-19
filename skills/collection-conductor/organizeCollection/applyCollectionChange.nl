---
description: Apply one planned effect and verify it on the refreshed panel tree.
args:
  before: CollectionSnapshot
  mutation: CollectionMutation
returns: CollectionStep
---
Call collectionChange.apply with before.id and mutation. Call verifyCollectionChange with the before and returned snapshots and the exact mutation. Return its finding and the returned snapshot as current.
