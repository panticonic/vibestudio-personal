---
description: Discover the live Mission Control board and complete the user's planning or handoff request.
budget: { maxTurns: 22 }
args:
  goal: string
returns: MissionGoalReport
---
1. Read the current board through missionGoalBoard.observe and call chooseMissionWork with the user's goal and that observation.
2. For each chosen intent, call executeMissionStep with the current snapshot. Keep the finding and use the returned snapshot for the next intent. An unverified write stops further work.
3. If the user requested a handoff and there was no unverified write, call prepareMissionHandoff with the final snapshot and selected card references. An accurately held card can be included in the handoff.
4. Return the ordered findings and the actual handoff receipt, or null when no handoff was staged.
