---
name: mission-control-store
description: Maintain Mission Control projects, task cards, saved views, and canonical execution links.
---

# Mission Control domain

`MissionControlStore` holds planning records; `MissionsDO` runs every execution
and schedule. Do not add a second run ledger, transcript store, scheduler,
heartbeat, timeout, or agent loop here.

Read a card before updating it and pass the revision you read. Leave fields you
are not changing alone, and re-read on conflict. Dependencies form a directed
acyclic graph across workspace projects. Moving a task keeps its identity,
links, and run history. A card's work state is separate from its executor's
lifecycle state.

Use the paginated `overview` for the shared presentation view and `taskOptions`
for choices that don't depend on filters. `taskDetail` reads one task's
automation and its paged run ledger. Store only the automation's identity; never
copy run status or chat transcripts.

The executor prompt is stable: it names the task and reads current domain state
when the run starts. A recurring card represents a series. Marking it Done
accepts the previous occurrence, and the next scheduled occurrence that is
admitted may start new work. Cancelled cards and archived projects stop work.
Every occurrence still waits for its dependencies to be accepted.

`MissionsDO` handles cancellation, including during admission and preparation.
Mark the task cancelled only after that cancellation returns. If joining the
cancelled run fails, the original failure stays visible and the card stays
actionable. Archive only after execution commands, live runs, and enabled
recurrence have stopped. Task history is kept across archive and restore.

Run focused tests through the host's template projection, as described in the
panel README. Check the unit's build report for source, manifest, and permission
diagnostics before trying runtime calls.
