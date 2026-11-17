---
description: State what workspace memory holds about a query, every fact tied to the snippets that say it.
args:
  query: string
  asOf: number
returns: CitedFacts
budget: { maxTurns: 4, maxTokens: 6144 }
---
Call recall with query and asOf and return its result unchanged, from eval, so the evidence ids stay exact.
recall asks workspace memory, keeps the snippets that bear on query, states the fact each gives and flags
facts that conflict or rest on weak sources.
asOf is the invocation snapshot time in milliseconds since the Unix epoch; judge the age of every source against that snapshot.
