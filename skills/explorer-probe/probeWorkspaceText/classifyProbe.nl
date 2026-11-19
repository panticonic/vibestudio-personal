---
description: Distinguish a broken native contract from an incorrect statement about a successful round trip.
args:
  input: TextProbeInput
  plan: TextProbePlan
  receipt: TextProbeReceipt
returns: TextProbeAssessment
---
Call verifyContract with plan and receipt. If it returns an issue, return bug with that issue. Otherwise call reviewClaim with input and receipt. Return doc-mismatch with issue claim when the observation contradicts the statement. Otherwise return ok and null issue.
