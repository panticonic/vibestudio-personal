---
description: Interpret a verified scoped comparison without writing a finding or notifying the user.
args:
  input: ExplorerFacilityEvidence
returns: FacilityReview
---
A match is ready / coverage-only and cites the observation. If a matched result independently resolves a matching historically failed finding, return ready / previous-finding-resolved citing previous then observation. If a non-matching observation repeats an already matching finding, return attention / finding-already-recorded citing previous then observation. Otherwise documentation-only is attention / doc-mismatch; violated-invariant is attention / contract-violation; surprising is attention / surprising-result. Cite expectation then observation for new findings.
