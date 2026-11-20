---
description: Recover and organize local browser references and leave a verified handoff in the current collection.
args:
  goal: string
returns: PersonalArtifactsReport
budget: { maxTurns: 14 }
---
1. Call maintainLibrary with the user's goal. Keep the actual library result.
2. Call arrangeCollection with the user's goal and that library result. Use its returned outcome unchanged.
3. Report both results with their actual observed states.
