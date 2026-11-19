---
description: Verify both the persisted scene and the visible stage and notes.
args:
  stop: TourStop
  frame: TourFrame
  sceneCount: number
returns: TourReadback
---
Check storedScene equals stop.scene.id and storedNotes equals stop.notes. Check eyebrow equals stop.scene.eyebrow, heading is nonempty, progress names stop.scene.position out of sceneCount, and notesVisible equals stop.notes. Return the exact frame and verified if every check agrees, or mismatch.
