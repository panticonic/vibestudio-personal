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

## A cited summary

To state what memory holds about a topic, with each fact tied to the snippets that say
it, load the typed summary instead of reading result lists:

```ts
const memory = await natlang.load("skills/memory/recall/recallSummary.nl");
const found = await memory.recall("retry backoff policy");
// found.facts[i]: { text, evidence: ["e1", ...], caveats: [{ kind, detail }] }
// found.evidence: the snippets those ids name, as recall returned them; found.nothingFound
```

A small model keeps the snippets that bear on the query and states what each says; exact
checks drop any fact whose figures the snippet lacks. Facts that agree are merged,
facts that contradict each other carry a `conflicts` caveat, and facts resting on one
snippet, only on conversation messages, or on sources older than 180 days say so.
Treat caveats as reasons to verify against the source records (`evidence[i].where`), as
the summary's `note` says.
