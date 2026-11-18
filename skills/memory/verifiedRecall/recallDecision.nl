---
description: Find a past workspace decision and verify the answer in the exact assigned file revision.
args:
  request: DecisionRequest
returns: DecisionReport
budget: { maxTurns: 16 }
---
Call findDecision(request). If no lead matches the assigned revision, return no-lead with null leadId and citation. Otherwise call verifyAtRevision with the selected lead and request.field. Return its exact report. A commit summary supplies a lead. Only the file read can supply a verified quote.
