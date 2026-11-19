---
description: Verify the destination, sibling anchor and ancestry before organizing a subtree.
args:
  action: CollectionAction
  current: CollectionSnapshot
returns: CollectionMutation | null
---
1. For a move or group, call locateCollectionPanel on the requested parent and require a unique collection (source about/collection). A missing destination or ordinary panel is held.
2. For group, return null if the destination already has a direct child with the requested title. Otherwise return the group mutation.
3. For move, call locateCollectionPanel on the target. Reject the root, the parent itself and a parent descended from the target. If after is provided resolve it through locateCollectionPanel, require it to be a distinct direct child of the destination, then use its ID as afterId. If no after is given use null for top. Return the exact move mutation.
