---
name: open-personal-goal
description: Discover the current Mission Control board and carry out an authorized planning or handoff goal.
---

Load `program/workOnMissionGoal.nl` with the caller's Mission Control and
handoff bindings. Pass the user goal as the only argument. Decide from the
current board which cards are relevant, what is blocked, and which changes the
user authorized. Reobserve the board after a competing edit. Stage a handoff
only from the verified final snapshot, and report any unresolved prerequisites.
