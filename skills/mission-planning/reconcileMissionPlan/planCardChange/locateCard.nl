---
description: Resolve a card by exact title and optional project from the assigned planning board.
args:
  reference: CardRef
  snapshot: MissionSnapshot
returns: MissionCard | null
---
Trim the reference and compare title and any project qualifier case-insensitively. A supplied project must identify one live project. Consider only cards in live projects. Return one matching card only when its identity is unique.
