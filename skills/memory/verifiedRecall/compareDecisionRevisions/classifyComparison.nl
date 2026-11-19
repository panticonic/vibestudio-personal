---
description: Decide whether two independently verified citations establish a change in the assigned field.
args:
  request: DecisionComparisonRequest
  before: DecisionReport
  after: DecisionReport
returns: DecisionComparisonStatus
---
An unverified endpoint leaves the comparison unverified. Require verified reports, distinct assigned revision identities and citations from the corresponding revision at each endpoint. Call decisionValue.fromQuote for the field and each citation's quote. If either value is missing, return unverified. Return unchanged when the two values are exactly equal, otherwise return changed.
