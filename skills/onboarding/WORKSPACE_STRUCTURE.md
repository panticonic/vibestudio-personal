# Workspace Directory Structure

A Vibestudio workspace is a set of source directories backed by one semantic
provenance/VCS graph. Each context folder materializes one state from that graph;
contexts do not keep separate histories.

## Layout

```
source/
  meta/                 ← Workspace metadata
    vibestudio.yml      ← Workspace config: init panels, external git remotes
    AGENTS.md           ← Agent system prompt
  panels/               ← Panel source code
    chat/               ← Default chat panel
    my-panel/           ← User-created panel
  packages/             ← Shared libraries
    runtime/            ← @workspace/runtime
    my-lib/
      SKILL.md          ← Repo-specific agent guidance for this package
  skills/               ← Cross-repo agent skill packages
    onboarding/         ← Workspace-wide onboarding skill and setup references
      SKILL.md
    sandbox/            ← Sandbox execution skill
    workspace-dev/      ← Workspace development skill
  workers/              ← Workerd Durable Object source
    agent-worker/       ← Default AI chat worker
  apps/                 ← Trusted workspace apps
    shell/              ← @workspace-apps/shell (Electron shell target)
    mobile/             ← @workspace-apps/mobile (React Native target)
    remote-cli/         ← Optional terminal app target shape
  extensions/           ← Trusted Node extension units
    shell/              ← @workspace-extensions/shell
  about/                ← Built-in about/help pages
  templates/            ← Panel/worker scaffolding templates
  projects/             ← Plain editable repos, not runtime units
state/
  .context-projections/
    v5/                 ← Current-epoch disposable context projections
  git-checkouts/        ← Operational Git interchange; never workspace source
  build-sources/        ← Disposable exact semantic/CAS build projections
  .databases/           ← workerd Durable Object SQL state
```

## The meta/ Directory

`meta/` holds workspace-level configuration that agents need to read:

- **vibestudio.yml**: workspace configuration (initial panels and external Git
  remotes). The server reads it at startup; agents can read it with
  `workspace.getConfig()`.
- **AGENTS.md**: the system prompt injected into every agent session. The
  resource loader loads it at agent startup. Agents can also read it from
  `meta/AGENTS.md` in their context folder.

Workspace-wide onboarding lives in `skills/onboarding/` because it describes the
whole workspace, not the `meta/` config repo.

Like every other source directory, `meta/` is tracked by the workspace-wide
semantic VCS. This means:

- It is readable from any context (materialized into the context folder on
  demand).
- Agents can make local changes and commit their full context chain.
- Publishing the committed workspace event triggers the affected rebuilds and
  config reloads.
- External Git checkouts live under `state/git-checkouts/`, never in workspace
  source. Import an external repository with one explicit userland
  `git.importProject()` call; it returns unpublished candidates. To configure a
  remote for targeted approval, use `git.setSharedRemote(path, remote)` rather
  than editing a checkout by hand. See
  [EXTERNAL_GIT_PROJECTS.md](EXTERNAL_GIT_PROJECTS.md) for config shape,
  approvals, branch/default discovery, logical credentials, import evidence, and
  non-mutating previews.

## Context Folders

When a panel or agent session starts, it gets a **context folder**: an isolated
materialization of one context's working state. Each context has one committed
event and a working head (event plus local applications). The files on disk are
a disposable projection; history lives only in the context graph.

Managed edits record changes as local applications. Compare and merge read
incoming work in bounded, stable-coordinate pages; commit takes the whole local
chain. Run checks against the context for advisory confidence. Protected
publication validates semantic ancestry and integration, gets approval, and
atomically advances `main`; builds follow separately. Read
[vibestudio-vcs](../vibestudio-vcs/SKILL.md) before working on source.

A panel runs code from its own context unless `ref` names other code; a worker
created directly runs code from its creator's context. Build services build
protected `main` unless given a `ctx:<contextId>` ref. Content-only build
selectors work for rendering and builds but cannot serve as semantic ancestry
or authorize mutations.

## Trusted Apps And Extensions

Apps and extensions use flat source paths. A package named `@workspace-apps/foo`
lives at `apps/foo`; a package named `@workspace-extensions/bar` lives at
`extensions/bar`. Do not add package scope segments to the path.

Workspace app targets are:

- `electron`: browser/Electron shell surfaces.
- `react-native`: mobile workspace app bundles.
- `terminal`: supervised Node CLI/client processes for terminal-client tooling.

Capabilities are declared in `package.json`. User and device invitations are
account operations on the typed `hubControl` service, not app capabilities.

For the full trust and client-auth model, see `docs/trusted-workspace-units.md`
in the Vibestudio source checkout. Authoring apps, target contracts,
capabilities, mobile bootstrap, and terminal clients is covered by the `appdev`
skill in your System workspace (`skills/appdev/SKILL.md` there); this workspace
does not include it.

## Plain Projects

`projects/` holds repositories you want to edit in the workspace that are not
panels, workers, skills, templates, or packages consumed by the workspace build.
Examples: upstream application checkouts, third-party libraries, or larger patch
branches an agent is preparing.

Plain projects imported from Git are still external Git-backed projects:

- They become shared workspace source only after the import candidate is
  integrated, committed, and published. A host clone alone does not change
  workspace state.
- Once published, contexts read them through the normal materialization path.
- Shared remotes declared under `git.remotes.projects.<repo>.<remoteName>` are
  configured in the checkout under `state/git-checkouts/`. Use object
  declarations with `url` and `branch` when a project must clone a non-default
  branch.
- `git.importProject({ path: "projects/name", remote })` configures the remote,
  clones, and enters the semantic graph through one explicit
  `vcs.importSnapshot` work unit. It returns a committed candidate context and
  event, plus semantic evidence from the same atomic import, without advancing
  protected `main`. Later pulls use the same snapshot import for that repository
  identity; each import records normal changes and goes through the same
  coordinate merge path.
- One userland `git.importProject()` call creates one unpublished candidate per
  external source. Importing alone never advances protected main.
- Build V2 reads published or candidate semantic state through the CAS. It
  never builds from the Git checkout.
- They are not launchable runtime units and do not become `@workspace/*`
  packages.

For branch-aware declarations, import approvals, acquisition behavior, and
retrying private repos with credentials, see
[EXTERNAL_GIT_PROJECTS.md](EXTERNAL_GIT_PROJECTS.md).

## Workspace templates and live workspaces

Base, Personal, and System are separate Git repositories containing workspace
templates. Personal and System declare Base as a dependency in their own
`meta/vibestudio.yml`. Base supplies common agent functionality; Personal
supplies personal work and browser-data services; System supplies the native
client and system workflows. Each user has their own non-shareable Personal and
System workspaces. Other workspaces can have explicit members. No running Base
workspace is needed.

1. The host fetches and verifies the selected template's URL, ref, commit, and
   snapshot. The host contains no fallback workspace source.
2. It recursively fetches declared dependencies and merges their inventories and
   manifests beneath the selected template.
3. It imports the composed repositories through `vcs.importSnapshot` work
   units, then builds and activates the resulting manifest.
4. It keeps dependency identity in `meta/vibestudio.yml`. When the workspace is
   published as another template, inherited repositories are excluded and the
   dependency declarations remain.

A fresh development or system-test instance uses the same templates and
bootstrap process. Editing a live workspace changes that workspace's source.
Publishing or suggesting those changes is a separate explicit step, and it never
copies them into a host checkout.
