---
description: Verify the exact updated field together with the card's identity and linkage.
args:
  before: MissionSnapshot
  after: MissionSnapshot
  changes: MissionChanges
returns: MissionFinding
---
Cite both observation IDs. Find the same exact card in both complete snapshots. Require the same ID, title and automationId and a revision exactly one greater than before. Call verifyPlanningFields with the two card records and the changes. On full success report verified with the card ID and no blockers. Otherwise return unverified with null cardId and blocker unexpected-board-state.
