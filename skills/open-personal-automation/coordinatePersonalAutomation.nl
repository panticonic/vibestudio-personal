---
description: Resolve and verify scheduling changes across the Personal automation handoff.
args:
  goal: string
returns: Report
budget: { maxTurns: 48 }
---
1. Observe operatorQueue. Keep the actual observation as the current queue. Start with an empty list of findings.
2. Call chooseNext with the goal, current queue, and findings. For operate, call operateMonitor with the current observation ID, selected monitor, and requested action. Keep its actual queue and finding. For record, use recordFinding to preserve the selected live monitor or the observed absence. Add one finding for each requested target. Do not duplicate findings.
3. Repeat only while there is unresolved goal work. When the planner finishes, report its disposition and all actual findings. A partial outcome preserves independently completed work.
