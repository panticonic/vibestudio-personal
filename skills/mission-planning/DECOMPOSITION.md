# Mission planning review

A planning review prepares cards for a human owner and checks how the cards
depend on one another across assigned projects. Mission Control owns the
planning state. Its execution service continues to own runs, logs and schedules.

| Responsibility | Natlang stage | TypeScript mechanism |
| --- | --- | --- |
| Observe the planning board | Read assigned projects and cards, then use the newest snapshot for each proposal. | Read Mission Control with bounded pagination. |
| Resolve the card and prerequisites | Distinguish same-title cards across projects and hold ambiguous references. | Project canonical card IDs and revisions. |
| Assess readiness | Follow prerequisite chains, hold possible cycles and report incomplete blockers. | Mission Control enforces graph integrity at commit. |
| Reconcile the plan | Replace prerequisites, relocate cards, or mark a card ready for an owner when its dependencies are complete. | Update only the authorized fields with the observed revision. |
| Confirm effects | Verify unchanged identity, preserved fields, the next revision and the planned change. | Re-read the authoritative planning store. |
