---
description: Check whether the assigned statement is contradicted by the successful native receipt.
args:
  input: TextProbeInput
  receipt: TextProbeReceipt
returns: '"contradicted" | "supported-or-unresolved"'
---
A claim that reports use characters is contradicted when bytes differ from characters and the measured size equals bytes. A claim that line endings are normalized is contradicted by unchanged exact content when the input includes CRLF. For a byte claim or no claim use supported-or-unresolved.
