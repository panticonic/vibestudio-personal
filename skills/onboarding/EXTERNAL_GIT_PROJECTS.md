# External Git Projects

Vibestudio workspace source lives in a semantic provenance/VCS graph; Git is an
external transport. External Git repositories can be declared in
`meta/vibestudio.yml`. Their checkouts live under the server's
`state/git-checkouts/`, never in workspace source. Content enters the workspace
only through explicit external snapshot work units.

## When To Use This

Use an external Git project when source should be editable in the workspace
while still tracking an upstream Git remote. Common examples:

- a plain upstream repo under `projects/name`
- a panel, worker, skill, package, template, plain project, or about page
  imported from another repository
- a branch an agent is preparing for review outside the Vibestudio workspace
  repo

Supported parent directories are `panels`, `packages`, `workers`, `skills`,
`about`, `templates`, and `projects`.

To use an app distributed as a workspace template, follow
[Templates](../templates/SKILL.md) to inspect its source and open a new
workspace. Importing a repository here edits source inside the current
workspace; do that for a template only when the user wants to work on the
template's source. The **Add workspace** surface also accepts a local folder or
URL. See [workspace creation](../templates/references/workspace-creation.md) for
native folder selection, website links, and development checkout options.

## Config Shape

Shared remotes live under `git.remotes.<parent>.<name>.<remoteName>`.

Every remote uses the same object shape. Omit `branch` to use the remote's
default branch:

```yaml
git:
  remotes:
    projects:
      upstream:
        origin:
          url: https://github.com/owner/upstream.git
```

When `git.importProject()` is called without a branch, it discovers the
remote's advertised default and records it. Stored URLs must be HTTP(S) URLs
with no credentials, query parameters, or fragments. Authenticate with a
selected credential instead of storing a URL that contains a token.

Add `branch` when the workspace should clone a specific branch:

```yaml
git:
  remotes:
    projects:
      upstream:
        origin:
          url: https://github.com/owner/upstream.git
          branch: feature/workspace-integration
```

An imported repo also has a matching entry under
`git.upstreams.<parent>.<name>`. `git.importProject()` writes the remote and the
upstream together, with `autoPush: false`, so no separate `git.setUpstream()`
call is needed. If an identical declaration already exists, import reuses it and
leaves its credential, author, auto-push, and other remote settings unchanged.
If the URL, selected remote, or branch conflicts, import fails until you edit
the declaration yourself.

## Import APIs

Use `git.importProject()` to add the config declaration, clone the repo, and
create its first semantic `vcs.importSnapshot` candidate:

```ts
import { git } from "@workspace/runtime";

const imported = await git.importProject({
  path: "projects/upstream",
  remote: {
    name: "origin",
    url: "https://github.com/owner/upstream.git",
    branch: "feature/workspace-integration",
  },
  credentialIdOverride: "cred_github_...", // applies to this call only; never persisted
});

console.log(
  imported.candidate.contextId,
  imported.candidate.eventId,
  imported.candidate.semanticEvidence,
);
```

The remote's `branch` is recorded on both the shared remote and the matching
upstream.

`credentialIdOverride` applies only to that call. If you omit it, the
declaration's logical credential binding is used when there is one, and
anonymous transport otherwise. Passing `null` forces anonymous Git HTTP.

All files in the imported tree get stable repository and file identities, and
the import records them as normal repository/file changes under one import work
unit. That work unit's required `externalSnapshot` holds the credential-free
remote URI, the revision, and the snapshot digest. The semantic workspace
derives these only after verifying the full descriptors against their CAS bytes.
The server-local checkout path and transport credentials are not part of
provenance. Blame stops at the snapshot when a line's last change belongs to the
import work unit; Git ancestry and per-path commit metadata stay in Git. Git
commits never become a second workspace-event DAG.

`candidate.semanticEvidence` is always returned. The same atomic transaction
that commits the candidate returns its application, import work unit, and
external snapshot; the bridge does not reconstruct these IDs afterwards. Agents
can inspect those IDs and verify the source URI, revision, digest, and target
repository identities.

The candidate is committed in its own import context, but it is not on protected
`main`. To land it:

1. From the working context where the project belongs, merge
   `imported.candidate.eventId` through the agent-facing VCS driver.
2. Review the final packet and run checks.
3. Commit the whole chain with that event as the integrated source.
4. Call `vcs.push` only when you intend to publish.

`autoPush: false` is an outgoing Git setting; changing it never publishes an
incoming candidate.

`git.importProject()` handles one project at a time: each import work unit has
one source coordinate and never mixes several Git remotes.

The Git clone is not a Build V2 source tree. Builds resolve the semantic
repository state through the CAS, so an unintegrated candidate cannot run just
because its Git checkout exists.

For a later fetch or pull, the adapter calls the same `vcs.importSnapshot`
operation with the existing stable `repositoryId`, the complete snapshot, and
the source revision. Files that still exist keep their identities. Use the
import operation; do not present an external snapshot as `vcs.edit` intent. The
import still records normal changes, so compare, merge, and revert need no
import-specific handling. The pull returns the candidate context and event IDs
and leaves protected `main` untouched. `upstreamStatus` reports
`integration-required` until normal semantic integration has taken in the
candidate.

Use `git.setSharedRemote()` when the workspace repo already exists and you only
need to record or update a shared remote:

```ts
await git.setSharedRemote("projects/upstream", {
  name: "origin",
  url: "https://github.com/owner/upstream.git",
  branch: "main",
});
```

If an existing workspace is missing a declared repository, import that one
repository explicitly. The call creates or reuses the declaration and returns an
unpublished candidate; it never advances protected main:

```ts
const candidate = await git.importProject({
  path: "projects/upstream",
  remote: { url: "https://github.com/owner/upstream.git", branch: "main" },
});
```

## Ongoing synchronization

Publishing to the semantic workspace and pushing to external Git are separate
steps:

1. Run `git.upstreamStatus([repo])` before deciding what to do. Status always
   queries the remote; there is no cache-only mode.
2. For local work, edit, check, commit, and publish through semantic VCS first.
   Then call `git.pushUpstream(repo)` to export protected main and push the
   resulting Git commit.
3. If the remote is ahead or has diverged, preview with
   `git.pullUpstream(repo, { dryRun: true })`, then pull once. The pull returns
   a committed candidate and does not advance protected main. The preview uses
   an isolated temporary checkout and changes no managed checkout, bridge,
   semantic, or remote state.
4. Compare and merge that candidate by stable coordinate, review the combined
   intents, check, commit the whole chain, and publish it through semantic VCS.
5. Fetch status again. Call `git.pushUpstream(repo)` only after the
   `integration-required` candidate has cleared.

For persistent access, give the upstream a logical `credential` name.
`credentialIdOverride` overrides it for one call; omit it to use the logical
binding, or pass `null` to require anonymous HTTP. Declarations without a
credential try anonymous access first, so a public repository never prompts for
credentials.

If a successful fetch reports `remoteBranchExists: false`, the declared branch
was deleted or not yet created. Push to create it, or update the declaration.
Zero counts in that case do not mean the repo is in sync.

Load [Git Bridge](../../extensions/git-bridge/SKILL.md) for remote declarations,
CLI equivalents, the full list of status states, and the divergence playbook.

## Acquisition behavior

External repositories are added after bootstrap through explicit userland
`git.importProject()` calls. Each source produces a semantic candidate. That
project becomes shared workspace source only after the usual compare, merge,
review, check, commit, and explicit publish. Upstream declarations describe
ongoing synchronization; they never trigger imports at host startup.

## Approvals

`git.importProject()` asks for one workspace config approval that covers both
declarations. The prompt names the external import and shows the destination
path, remote name, remote URL, and branch (if any). After approval, Vibestudio
writes both declarations to `meta/vibestudio.yml` with auto-push disabled, then
clones.

If the clone fails for a newly written declaration, the host tries to roll both
declarations back and reports whether that worked. If nothing was persisted,
retry the same import. If the rollback failed, status reports
`not-materialized`; retry the import or explicitly detach the upstream and
remote. A path that is configured but not cloned is not imported content.

A successful config change queues provider reconciliation right away, without
waiting for the provider to be ready.

## Private Repos

Git operations resolve a declaration's logical credential through the
profile-local binding table. Declarations without one are tried anonymously
first. Private repositories need either a userland account connection or a
per-call credential override.

For private repos, either:

- call `git.importProject({ ... })` when first adding the repo (a credential
  override applies only to that call), or
- connect the account through the normal credential surface, then use its
  logical name in the declaration.

Do not expose PATs to userland code. For direct Git smart HTTP operations, use
`@vibestudio/git` with `credentials.gitHttp()` so the host handles credentials.

For import invariants, idempotent retry, identity preservation, and
verification, read
[external snapshot import](../vibestudio-vcs/references/external-snapshot-import.md).
