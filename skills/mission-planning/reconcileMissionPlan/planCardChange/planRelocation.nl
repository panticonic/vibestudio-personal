---
description: Resolve an active destination for this same stable card.
args:
  target: MissionCard
  destination: string
  snapshot: MissionSnapshot
returns: MissionDecision
---
Match the trimmed destination name case-insensitively across the assigned non-archived projects. Hold with destination-not-unique if the match is missing or ambiguous. Hold with already-in-project if the destination is the card's current project. Otherwise return a relocate change with the card ID, current revision and destination ID.
