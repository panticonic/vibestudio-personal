---
description: Interpret the matched one-time migration using its status and committed counts.
args:
  input: BrowserFacilityEvidence
returns: FacilityReview
---
No receipt is waiting / import-unobserved with target ID. Running is waiting / import-running, applying is waiting / import-applying. Complete is ready / snapshot-complete. Cancelled with committedCount greater than zero is attention / cancelled-with-commits, otherwise attention / cancelled-no-observed-commits. An application_failed state is attention / import-application-failed, another failure is attention / import-failed. Cite the matched receipt ID for all these outcomes. Reports speak about this snapshot only.
