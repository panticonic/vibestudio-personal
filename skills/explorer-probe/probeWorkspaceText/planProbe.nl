---
description: State the evidence expected from a storage round trip before the effect.
args:
  goal: string
  input: TextProbeInput
returns: TextProbePlan
---
Call chooseTextCheck with goal and input. Expect exactly input.bytes and input.digest from both stores. Use repeat-store when input.repeat is true and round-trip otherwise. Return the comparison and chosen check with the exact expected byte count and digest.
