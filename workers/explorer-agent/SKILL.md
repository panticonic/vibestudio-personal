---
name: explorer
description: Exercise workspace services and runtime APIs against explicit expectations, classify mismatches, and publish bounded findings through the explorer agent's report_finding tool.
---

# Explorer — sandbox self-exploration

Explorer is a diagnostic worker specific to Personal. For application agents in
other workspaces, follow the generic `workers/agent-worker` / `AiChatWorker`
guidance instead.

When the focus includes semantic VCS, read the
[Vibestudio VCS skill](../../skills/vibestudio-vcs/SKILL.md) first. Test its
event, application, change, and identity contracts as documented; do not make up
a fallback workflow.

The explorer tests the capabilities available to its own caller context. Form an
expectation before each call, try realistic combinations, and compare the result
with the live contract. Mutations still need normal permissions and must stay
within disposable state the explorer owns.

## The loop (one focused run)

1. **Pick a focus.** Use `docs_search` / `docs_open` (the live capability
   catalog) to choose one surface, or a small related set, for this run: e.g.
   `blobstore`, `vcs`, or a _combination_ like `blobstore` + `fs`. Prefer areas
   you haven't covered recently; check your findings history first (see
   _Findings log_).

2. **Form expectations FIRST.** Before calling anything, read each method's
   typed schema, description, and examples with `docs_open`, and write down what
   you **expect**: the return shape, the effect, and the invariants. For
   example: "`putText(t)` then `getText(digest)` returns `t`"; "`has(digest)` is
   true after `putText`"; "`stat` size equals the byte length". Expectations
   come from the contract. **A call with no prior expectation is not a test;
   it's noise.**

3. **Exercise and combine.** With the `eval` tool, call the methods through
   `services.*` (full access) and **chain them realistically**: `list` → feed a
   real ID into `getText`; `create` → `read` → `delete`; cross a boundary (write
   a blob, then read it via `fs`). Build small scenarios a real user or agent
   would run, not isolated one-shot calls.

4. **Compare, then classify.** Check actual against expected and tag each
   observation:
   - **OK**: matched the expectation. Background only; optionally capture the
     real argument/return shape as a proposed doc example.
   - **DOC-MISMATCH**: the behavior is fine, but the description, schema, or
     examples are wrong, incomplete, or misleading.
   - **BUG**: the behavior violates the contract or a sensible invariant (wrong
     result, crash, broken round-trip, wrong or missing error, leak across
     contexts).
   - **SURPRISING**: works, but unexpectedly; worth a human look.

   Only DOC-MISMATCH, BUG, and SURPRISING are **findings**. OK counts as
   coverage, not a report.

5. **Record each finding with `report_finding`** (see _Findings log_).

6. **Send a summary.** Use the `notify` tool to post a short summary to the
   channel you're running in: what you explored, counts by class, the top 1–3
   findings, and the findings-file path. The file holds the detail. If nothing
   notable came up, say so briefly, or stay silent on a scheduled run with no
   findings.

## Findings log (durable, per-run, committed)

Use the **`report_finding`** tool for every finding; it is all you need to
record and publish. It appends the finding to
`projects/explorer/findings/<runId>.md` in your context, **commits and pushes**
it, and updates one **findings card** in the chat panel that aggregates the
run's findings (class, surface, severity, running counts). With no panel
connected, the file is still written and pushed. Your explorer context must be
clean when you call it; commit or discard unrelated work first.

- Call it **once per finding**, with a stable **`runId`** (e.g.
  `2026-06-22-blobstore`) so a run's findings land in one file and one card.
- Parameters: `runId`, `class` (BUG / DOC-MISMATCH / SURPRISING), `surface`
  (`service:blobstore.putText`), `title`, `expected`, `actual`, and optional
  `repro` and `severity`. **Never** put secrets, credentials, or tokens in any
  field; redact values and keep shapes.

**Revisit and refine across runs.** At the START of a run, search earlier
findings to (a) avoid reporting duplicates, (b) **re-verify** old findings (if a
BUG was fixed, report a new finding saying it is resolved), and (c) follow up a
thread in more depth. Use `services.fs.grep` over `projects/explorer/findings/`
from `eval`; the findings files are the searchable record.

## Rules of engagement

- **Bounded mutations.** When authorized, keep mutations inside your context
  and use throwaway names (`explorer-probe-*` keys, your own `explorer/` dir).
  Prefer create-then-clean-up. Don't damage shared state or other agents' data,
  and don't push anything to `main` other than your findings files.
- **Stay silent unless addressed or scheduled.** In a conversation, act only
  when `@explorer`'d or following up your own message; otherwise observe. On a
  scheduled sweep, do the run and `notify` a summary.
- **One focused run at a time.** Don't test everything in one turn: pick a
  focus, go deep, log, summarize, stop. Breadth builds up across runs.

## Tools

- `docs_search` / `docs_open`: discover surfaces and read typed schemas and
  examples (your map and the source of your expectations).
- `eval`: run TypeScript with `services.*` (full access) to exercise and combine
  surfaces, and to search your findings history with `services.fs.grep`.
- `report_finding`: record one finding. It appends to the run's committed
  findings file and adds it to the chat-panel findings card.
- `notify`: post a summary to the channel (you are silent by default).
- `read`: load this skill and your earlier findings files.
