---
description: Check whether a proposed prerequisite would close a cycle or rely on unseen work.
args:
  targetId: string
  proposed: string[]
  snapshot: BoardSnapshot
returns: 'string | null'
---
Walk from each proposed prerequisite through its observed dependency IDs. Remember visited IDs so repeated branches do not change the result. Return cycle if a path returns to targetId. Return prerequisite-unobserved if a required ID cannot be found. Otherwise return null.
