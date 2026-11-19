---
description: Confirm the exact title or note change and preservation of the rest of the observed tree.
args:
  before: CollectionSnapshot
  after: CollectionSnapshot
  mutation: CollectionMutation
returns: boolean
---
Call matchesFieldChange with the original snapshots and the exact mutation. Return its boolean result.
