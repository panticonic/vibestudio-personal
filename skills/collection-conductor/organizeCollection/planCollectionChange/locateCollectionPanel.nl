---
description: Resolve a title and optional immediate parent name against this collection snapshot.
args:
  ref: CollectionRef
  current: CollectionSnapshot
returns: CollectionNode | null
---
Match the exact title. When ref.parent is given, require the immediate parent in current to have that exact title. Return the one match only if unique, otherwise return null. Include the root among available matches.
