---
description: Translate a user's Mission Control goal into ordered planning intents from the observed board.
args:
  goal: string
  snapshot: BoardSnapshot
returns: MissionGoalPlan
---
1. Identify the card or cards relevant to the user. Use project qualifiers established by the request or clearly supported by the observation. Preserve an unresolved title when several projects match and the request does not identify one.
2. Choose inspect for a question about state, ready for requested readiness, prerequisites for a requested replacement of direct dependencies, and relocate for a requested project move. Only plan changes justified by the user's goal. A hard condition about whether a move is safe still applies.
3. Order dependent intents so each uses the outcome relevant to it. Keep independent work available after a held intent.
4. If the user asks for a staged handoff, select the cards they want it to cover. Identify them as they should appear in the final board and keep their requested order. Otherwise leave handoff empty.
