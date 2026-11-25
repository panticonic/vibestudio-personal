---
description: Map an ordered set of presentation topics to the venue's authorized tour stops.
args:
  request: TourRehearsalRequest
  start: TourStart
returns: TourPlan
---
Return a TourPlan; the caller's reviewStops routine applies the planned stops and verifies the scene and notes readback.

For every topic in order, call resolveTourTopic with the topic and the allowed scenes from start.deck. Keep unmatched topics in order. For each matched scene, include a stop with the original topic and exact scene record. Set that stop's notes value to true when the goal expressly requests presenter notes, false for audience view or no notes, and start.frame.notesVisible otherwise.
