---
description: Decide whether a recalled snippet says something about the query.
readout: decision
args:
  query: string
  snippet: Snippet
returns: boolean
---
Answer true when snippet.text states a fact that answers or bears on query (a value, a decision, a name, a reason).
Answer false when it only shares words with query, or is about something else.
