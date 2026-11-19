---
description: Check the resulting parent and order without confusing a panel with its descendants.
args:
  before: CollectionSnapshot
  after: CollectionSnapshot
  mutation: CollectionMutation
returns: CollectionFinding
---
Cite the before and after snapshot IDs. For group, require a new direct child of the assigned parent with the exact title, source about/collection, and the root's context. For move, require the same panel ID and its assigned parent. Require the panel to be first among the destination's direct children for null afterId, or immediately after the specified sibling for an explicit anchor. Confirm the moved panel retains its subtree and its context. Return verified citing the group's or moved panel's ID, or unverified with null panelId.
