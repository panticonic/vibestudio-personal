---
description: Stage the user's requested handoff from the independently persisted final board.
uses: [workOnMissionGoal/locateMissionCard]
args:
  cards: CardLocator[]
  snapshot: BoardSnapshot
returns: 'HandoffReceipt | null'
---
Resolve the supplied card references with locateMissionCard against the final completed observation. Return null when a card is unresolved or the observation is incomplete. Otherwise stage the exact resolved card IDs in requested order with missionGoalHandoff.stage and return its actual readback receipt.
