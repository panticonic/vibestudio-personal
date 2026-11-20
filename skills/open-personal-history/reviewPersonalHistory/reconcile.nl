---
description: Compare evidence and choose whether the requested decision can proceed.
args:
  goal: string
  findings: Finding[]
returns: Report
---
With one verified result, report relation single. With verified endpoints, compare the values after the exact field names, ignoring formatting that does not change the values. Use same when all values agree and changed when they differ. Use unresolved when any required endpoint is missing, withdrawn or conflicting. Choose clear only if the evidence meets the user's stated condition. Otherwise hold. Preserve all milestone findings and citations.
