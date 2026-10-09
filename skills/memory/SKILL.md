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

`memory_recall` is an agent tool, not a portable panel, worker, or VCS API.
