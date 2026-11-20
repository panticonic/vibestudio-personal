---
description: Select one exact retained bookmark and uniquely identified collection panel.
args:
  goal: string
  view: MigrationHandoffView
returns: 'MigrationHandoffChoice | null'
---
Match the requested bookmark to the actual retained title and URL, and the requested collection panel to its exact title and parent together. Return those values unchanged. Never infer a URL or choose an ambiguous sibling.
