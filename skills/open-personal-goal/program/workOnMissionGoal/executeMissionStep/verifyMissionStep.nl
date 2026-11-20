---
description: Verify the exact card change and the surrounding board state from authoritative readback.
args:
  change: BoardChange
  before: BoardSnapshot
  after: BoardSnapshot
returns: boolean
---
1. Find the same card in both snapshots and require that its revision advanced by one. Require the readback board to be complete.
2. Confirm projectId for relocation, dependencies for prerequisite replacement, or status ready for a readiness change. Keep its title, automation identity and every other planning field identical, disregarding updatedAt.
3. Verify the remaining cards and projects match the previous board by identity and fields. Return true only when the readback verifies the selected change.
