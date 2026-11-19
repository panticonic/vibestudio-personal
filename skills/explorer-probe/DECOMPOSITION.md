# Workspace text probe

The Explorer skill's focused diagnostic loop supplies a Natlang procedure for
a caller-assigned text payload and optional statement about storage behavior.

| Responsibility | Implementation |
|---|---|
| Describe the assigned input and native byte and digest expectations | TypeScript over the exact input |
| Decide the evidence needed before exercising the services | Natlang plan and selected comparison |
| Write and read the same text using workspace content addressing and an owned scratch file | TypeScript around the native clients |
| Check exact UTF-8 sizes and content identities | TypeScript digest and length measurements, interpreted in nested Natlang assessments |
| Distinguish a broken contract from a misleading statement about it | Natlang classification |
| Confirm scratch cleanup and recommend one grounded follow-up | Natlang report using native cleanup evidence |

Findings stay in the returned report. The existing Explorer worker still owns
its durable findings log, publication, and channel notifications.
