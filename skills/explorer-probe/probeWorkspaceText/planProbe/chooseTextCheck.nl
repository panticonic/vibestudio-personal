---
description: Choose the diagnostic focus from the question and assigned text.
args:
  goal: string
  input: TextProbeInput
returns: '"utf8-size" | "line-endings" | "exact-content"'
---
For a question about CRLF, LF, or newline normalization, choose line-endings. For a byte count or character count question, choose utf8-size. Otherwise choose exact-content.
