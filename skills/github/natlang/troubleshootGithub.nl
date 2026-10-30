---
description: Turn a GitHub verification or Git failure into the next steps to fix it.
args:
  failure: string
returns: NextStep
---
Call collect with failure and return its result exactly as collect gave it, from eval. It names the cause of the
failure and looks up the steps that fix it.
