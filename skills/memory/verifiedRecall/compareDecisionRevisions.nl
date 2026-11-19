---
description: Compare the same workspace decision field at two assigned immutable revisions.
args:
  request: DecisionComparisonRequest
returns: DecisionComparisonReport
uses: [recallDecision]
budget: { maxTurns: 16 }
---
1. Call recallDecision with request.goal, request.query and request.field and eventId set to request.beforeEventId. Save its full report as before.
2. Call recallDecision with the same goal, query and field and eventId set to request.afterEventId. Save its full report as after even if the earlier revision was unverified.
3. Call classifyComparison with request, before and after. Return its status with the two original reports unchanged.
