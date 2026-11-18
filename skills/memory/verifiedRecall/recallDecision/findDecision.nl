---
description: Find one lead from the caller's assigned immutable revision.
args:
  request: DecisionRequest
returns: DecisionLead | null
---
Call searchHistory once with request.query. Then call chooseLead with the original request and results, and return its selected row exactly.
