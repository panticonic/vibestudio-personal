---
description: Apply one authorized scheduling transition and reconcile the live readback.
args:
  basis: string
  monitor: Monitor
  action: Action
returns: Step
budget: { maxTurns: 22 }
---
1. Apply the chosen action once using the exact owned monitor and observation. Keep the actual returned receipt. Read a fresh operatorQueue observation whether the receipt is applied, already, interrupted or blocked.
2. Call interpretReadback with the original monitor, action, receipt and fresh queue. Return the actual fresh queue and the resulting finding.
