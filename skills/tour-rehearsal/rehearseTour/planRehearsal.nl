---
description: Map an ordered set of presentation topics to the venue's authorized tour stops.
args:
  request: TourRehearsalRequest
  start: TourStart
returns: TourPlan
---
For every topic in order, call resolveTourTopic with the topic and the allowed scenes from start.deck. Keep unmatched topics in order. For each matched scene, make the stop with the original topic and exact scene record. Enable presenter notes when the goal expressly requests notes; hide them when it requests audience view or no notes. Otherwise preserve start.frame.notesVisible.
