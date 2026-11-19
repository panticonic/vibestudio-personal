---
description: Organize a caller-owned live panel collection and verify each change.
args:
  request: CollectionRequest
returns: CollectionReport
---
Call collectionState.observe and use that snapshot as current. For each action in order, call planCollectionChange. For a null plan append a held finding citing the current snapshot ID with null panelId and continue. For a plan call applyCollectionChange with current and the plan, append its finding and use its returned current snapshot for the next action. Stop after an unverified effect. Return the findings in order.
