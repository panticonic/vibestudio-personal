---
description: Find the workspace's source evidence for a claim and report what the evidence can establish.
args:
  request: PersonalMemoryRequest
returns: PersonalMemoryReport
budget: {maxTurns: 20}
---
1. Call frameSearch(request) with the actual request. Keep the authorized kinds. Use memory.recall exactly once with the requested or refined query, chosen kinds, and limit 8. Preserve returned source fields.
2. Call preserveSources on the results. Assess the relevant candidates with readEvidence. Keep exact stable evidence IDs for every extracted claim. Discard off-topic results without changing the source strings.
3. Call resolveHistory with request, evidence and claims. Return its assessment with only the exact evidence rows cited by the retained claims, and the actual dispatched search query. Verification requests point to the original source records. An apparent result from recall remains a discovery lead.
