---
description: Decide one planning action against the current card, project, and prerequisite observations.
uses: [workOnMissionGoal/locateMissionCard]
args:
  intent: MissionIntent
  snapshot: BoardSnapshot
returns: MissionDecision
---
1. Hold with board-incomplete if the snapshot is incomplete. Resolve intent.target with locateMissionCard. Hold with target-not-unique and null cardId if it cannot identify one live card.
2. To inspect readiness, list the observed IDs of direct prerequisites that are absent or status other than done, in their existing order. Return the resolved card and those blockers without a write. To mark Ready, apply the same check and also require the card to be in Inbox. Use card-not-in-inbox for another status.
3. For a move, find one observed active destination project. Hold with destination-not-unique if there is no unique active match. Hold with already-in-project if it is already the owning project. Otherwise choose relocate with the observed revision and destination ID.
4. To replace prerequisites, resolve each referenced card through locateMissionCard. Hold with prerequisite-not-unique for an unresolved card. Deduplicate exact IDs while preserving requested order and check the dependency graph through checkProposedEdges. Hold for its reported blocker. If the target is active, require every proposed direct prerequisite to be done, or hold with active-dependency.
5. Return a concrete change only when the checks favor it. Preserve the resolved card ID and use an empty blockers list for a concrete change.
