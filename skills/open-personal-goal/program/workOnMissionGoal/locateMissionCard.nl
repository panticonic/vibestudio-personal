---
description: Match one current Mission Control card unambiguously using the user-established project and title.
args:
  target: CardLocator
  snapshot: BoardSnapshot
returns: 'BoardCard | null'
---
Find cards whose current title matches the request and whose project is active. Respect the project name when supplied. Return the one matching card or null when the reference is ambiguous or missing.
