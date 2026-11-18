---
description: Identify unread observations and connections that have yet to be independently verified.
args:
  rows: SetupRow[]
returns: {unknown: string[]; needsVerification: string[]}
---
Use the original row order. In unknown list the ids whose observed flag is false or whose state is unknown. In needsVerification list the observed rows whose state is connected-unverified. Keep both lists distinct. Other owner states stay as reported. Do not infer permissions from any state.
