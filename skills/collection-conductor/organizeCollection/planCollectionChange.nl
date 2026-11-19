---
description: Turn one explicit organizational request into an exact scoped panel change.
args:
  action: CollectionAction
  current: CollectionSnapshot
returns: CollectionMutation | null
---
1. Return null if current is incomplete.
2. For note or rename call locateCollectionPanel on action.target. Require a unique descendant, excluding the root. Return that panel ID and the exact requested text or title.
3. For group or move call planCollectionPlacement. Return its result.
