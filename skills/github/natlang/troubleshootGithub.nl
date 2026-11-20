---
description: Turn a GitHub verification or Git failure into the next steps to fix it.
args:
  failure: string
returns: NextStep
budget: { maxTurns: 4, maxTokens: 6144 }
---
Call cause with the supplied failure. Pass that cause to steps and return the exact documented result from eval.
