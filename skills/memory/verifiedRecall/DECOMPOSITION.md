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
