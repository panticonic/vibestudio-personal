---
name: memory
description: Recall facts from past conversations or committed files, or continue from provenance attached to a managed-file read.
---

# Workspace memory

For questions about lines you have just read, use the evidence attached to a
managed-file `read`. It includes bounded context about intent, request,
decision, import boundary, and history. Follow its compact
`provenance({ target: "@r…" })` reference only when deeper history could change
the answer.

Use `memory_recall` when you don't know which file or conversation is relevant:

```text
memory_recall({
  query: "retry backoff policy",
  kinds: ["message", "file", "commit"],
  limit: 10
})
```

`query` is required; `kinds` and `limit` are optional. It searches completed
trajectory messages, text files at committed workspace events, and commit
summaries. Commit recall is especially useful for decisions or names that have
been removed from current files. Uncommitted working changes don't show up in
file recall until they are committed.

Recall helps you find things; it doesn't prove them. Verify message evidence
with the trajectory inspectors and source facts with
[Vibestudio VCS](../vibestudio-vcs/SKILL.md). Search indexes and read-time
summaries are rebuildable; continue from the source records they point to. For a
file whose relevant text was later removed, reuse the full continuation ref
returned by `provenance` unchanged. That ref carries the file root and an opaque
service cursor, which stay inside trusted code.

The same search is `memory.recall` in eval and other runtimes, for code that
needs recalled facts as data:

```ts
const { results } = await memory.recall({
  query: "retry backoff policy",
  kinds: ["file", "commit"],
  limit: 10,
});
// Each result has kind, snippet, where, appendedAt, path, eventId, logId, head.
```

`memory_recall` and `memory.recall` are one implementation under the caller's
own graph-read authority; only the tool formats the results as text.

## Natlang evaluation candidate

`recall/natlang.ts` exports `recall(query, asOf?)`, which runs the
`recallSummary.nl` program. `asOf` is a snapshot timestamp in Unix milliseconds;
omitted, the host wrapper captures the current time once. Recorded cases pass
their saved timestamp so replay judges source age against the same snapshot.
A direct `natlang.load("skills/memory/recall/recallSummary.nl")` call takes
both arguments. This candidate has not met its quality gate; verify recalled
facts through the workflow above.

[Personal Natlang workflows](../personal-workflows/DECOMPOSITION.md) also offer
a bounded memory branch for goals that combine source history with onboarding
or repository planning. The report retains the original cited record identity
and names the sources that need confirmation.
