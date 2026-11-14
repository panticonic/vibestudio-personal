---
description: State the fact one snippet gives about the query.
args:
  query: string
  snippet: Snippet
returns: string
---
Write one sentence that states what snippet.text says about query.
1. Use the snippet's own words, names and numbers.
2. Add nothing the snippet does not say. Do not say whether it is still true.
3. If snippet.text says nothing about query, return an empty string: the snippet then gives no fact.
