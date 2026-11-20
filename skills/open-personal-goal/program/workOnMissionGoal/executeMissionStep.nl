---
description: Assess one observed planning intent, recover from a stale revision, and verify an authorized write.
budget: { maxTurns: 22 }
args:
  intent: MissionIntent
  snapshot: BoardSnapshot
returns: MissionStep
---
1. Call decideMissionStep with the intent and current snapshot. If no change is chosen, return the current snapshot and its evidence ID. Use held for a nonempty blocker list and observed otherwise. Include the card's observed status or null for an unresolved card.
2. Call missionGoalChange.apply with the current snapshot ID and the selected change.
3. If it returns changed, take the returned snapshot as current and call decideMissionStep on the same intent. If that decision no longer permits writing, return its held or observed finding using the fresh evidence ID. Otherwise apply the reconsidered change once against the fresh snapshot.
4. For an applied result, call verifyMissionStep with the chosen change, its actual before snapshot, and the returned snapshot. Return the result snapshot and a verified finding with the before and after IDs and the card's actual final status when verification succeeds. Use unverified on another change or any inconsistent readback.
