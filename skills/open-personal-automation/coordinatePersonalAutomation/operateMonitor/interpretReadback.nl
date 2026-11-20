---
description: Reconcile one transition using the exact still-installed definition and actual scheduling state.
args:
  before: Monitor
  action: Action
  receipt: Receipt
  queue: Queue
returns: Finding
---
1. Find the same monitor identity in the fresh queue. A blocked receipt is held. If the receipt was interrupted and the revision changed or the desired state did not take effect, report uncertain. If the exact revision now has the desired state after an interrupted response, report reconciled. Never retry the transition.
2. An applied receipt with the desired state at the same revision is applied. An already receipt with the desired state at the same revision is unchanged. If the exact desired effect cannot be confirmed after either receipt, report uncertain.
3. Preserve the exact fresh monitor name, state, revision and reviewed revision and use the current observation ID as evidence.
