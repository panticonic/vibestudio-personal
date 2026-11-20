---
description: Verify and organize the selected collection artifacts, grounding links in the observed browser library.
args:
  goal: string
  library: ArtifactLibraryResult
returns: ArtifactCollectionResult
budget: { maxTurns: 28 }
---
1. Observe the collection. Ask decideCollection what still needs to happen, given the user's goal, current collection and actual library result.
2. For an independent change, use artifactCollection.apply with the observation ID and selected mutation. For a link, require a selected bookmark from the library outcome and use artifactCollection.link with both observations, that exact bookmark ID, the selected panel ID and the requested heading.
3. Keep each returned state. On changed, reconsider the goal against the fresh state. On held, stop and report held. Otherwise call decideCollection again only for unfinished work. Return the actual state and the final disposition.
