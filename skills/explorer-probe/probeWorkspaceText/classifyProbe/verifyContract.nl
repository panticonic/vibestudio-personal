---
description: Compare the native storage receipt to the exact expected bytes and identities.
args:
  plan: TextProbePlan
  receipt: TextProbeReceipt
returns: '"content" | "byte-count" | "repeat" | "cleanup" | null'
---
1. If the blob is absent or the blob digest, blob read digest, or scratch file digest differs from the expected digest, return content.
2. If the written byte count, blob stat size, or scratch file size differs from the expected bytes, return byte-count.
3. For repeat-store, a repeat digest different from the original is repeat.
4. If the scratch file was not removed, return cleanup. Otherwise return null.
