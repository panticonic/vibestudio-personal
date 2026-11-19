# Verify a recalled decision

The Personal memory skill separates finding an old decision from proving it.
This workflow searches the workspace recall index, chooses a candidate at the
assigned revision, then opens that exact immutable file through VCS. The
returned quote comes from the snapshot.

- `findDecision` owns search and source choice. `chooseLead` chooses by the
  assigned revision and information need, with no VCS write authority.
- `verifyAtRevision` reads one selected lead and calls `locateField` to find
  the relevant line in the verified document. Its TypeScript helper copies
  the exact line and constructs the citation.
- The caller binds one search term, repository, path and revision. Read
  indexes, authoring state and uncommitted drafts remain separate.
- A removed file, a revision with no recalled lead and a present file with
  no matching field produce distinct outcomes.

`compareDecisionRevisions` handles a caller-assigned earlier and later
revision of the same decision field. It calls `recallDecision` for each
revision in order, preserves both reports, and delegates the disposition to
`classifyComparison`. A comparison needs two verified citations. The crisp
`decisionValue` helper strips the field label and surrounding whitespace
before comparing values. It leaves the original quotations and line numbers
intact. If either read is inconclusive, the report preserves both independent
outcomes with an unverified comparison.
