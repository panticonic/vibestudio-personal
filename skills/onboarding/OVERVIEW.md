# What is Vibestudio?

> This is the user-level overview. For the underlying design (trust boundary,
> storage model, permission system), read the
> [architecture skill](../architecture/SKILL.md).

Vibestudio is a desktop application (Electron) that gives each account a
private Personal workspace and a private System workspace, plus any shared
workspaces. Panels are TypeScript apps, stacked horizontally, each running in an
isolated webview. An AI agent in the chat panel can create, edit, and launch new
panels on the fly.

## Key Concepts

### Panels

Panels are the building blocks of a workspace. Each panel is a self-contained
TypeScript/React app, bundled by esbuild and served in its own webview. Panels
can:

- Access a sandboxed filesystem, AI models, and DO-backed app databases
- Open browser panels to view and automate websites
- Communicate with other panels in the same workspace via RPC
- Launch child panels

The **chat panel** is the default root panel, where you talk to the AI agent.

### Trusted Apps

Trusted workspace apps live under `apps/` and use package names such as
`@workspace-apps/shell`, `@workspace-apps/mobile`, and
`@workspace-apps/remote-cli`. Apps are trusted client runtimes, not panels. Use
the `appdev` skill before creating or changing apps.

### Workspaces

A workspace is a named collection of panels, packages, workers, and
configuration. You can:

- Create multiple workspaces (e.g. "personal", "work", "experiment")
- Fork a workspace to branch off a snapshot
- Switch focus to another workspace; each keeps its panel tree and drafts
- Configure which panels open on first launch (`initPanels`)

Workspace config lives in `meta/vibestudio.yml`. Each workspace has one semantic
provenance/VCS graph with a committed event and a working head. Contexts,
source, and runtime state stay inside their workspace.

The native client runs from the user's System workspace; `about/new` opens
locally in the current workspace. Workspaces are created and selected from the
native client's signed-in hub controls.

Cross-workspace RPC names an explicit destination. The call must pass three
checks: the receiving method's declared exposure, the source's outgoing policy,
and the destination's incoming policy. After that, the operation still needs its
normal permissions, and an approval cannot override a hard workspace policy. See
[Sandbox](../sandbox/SKILL.md) and its runtime API reference for calls from
agents.

### Contexts

A context is a workspace-local branch of source and state for a panel. It is not
a native security boundary. Each context gets:

- Its own **context folder**, a materialized view of the workspace state
- A unique **context ID** used in URLs and storage

Panels in the same context share a filesystem. The chat agent and its child
panels usually share a context so they can see each other's files. A context
cannot load source from another workspace. Quickfire uses the workspace of its
target panel.

### The Agent (Chat Panel)

The chat panel hosts an AI agent that can:

- **Run code** with the `eval` tool. Code runs server-side in the agent's own
  notebook kernel, which keeps live objects while active and can be recovered
  exactly from durable state; it works even if the panel is closed.
- **Render UI** with `inline_ui` (persistent components and self-contained
  workflows in chat) and `load_action_bar` or a panel's `actionBarFile` (compact
  pinned panel controls). Use `feedback_custom` only when the agent needs
  structured input for its own reasoning, never for trust, permission,
  publication, or workspace-settings decisions, which go through host
  approvals.
- **Preserve transcript state** through typed PubSub events. Messages,
  invocations, inline UI, and action bars all replay from the same channel log.
- **Read and write files** in the workspace
- **Build and launch panels** on demand
- **Connect API provider integrations** such as Gmail, GitHub, Slack, and other
  OAuth or credential-backed services
- **Tune its own model defaults**: the host chat agent's provider, effort,
  approval, and chattiness are configurable
- **Import browser data in Personal**: cookies, passwords, bookmarks, history
- **Automate browsers** with Playwright-style CDP automation
  (`handle.cdp.session()`)
- **Schedule recurring work**: run an installed worker method, inline eval, or
  agent prompt on an interval or a timezone-aware cron schedule, optionally
  ending at a time, after a run limit, or on a natural-completion response.
  Every tick can be inspected and controlled from its chat-history pill or from
  Automations.
- **Use private eval SQLite for scratch work**, call DO-backed app databases,
  call AI models, and manage workers

### Automations

Automations are recurring tasks that start as soon as they are launched. There
are three kinds:

- A reusable deterministic job runs as a method on a specific Durable Object
  build.
- A small script can run inline in an existing agent's channel-bound EvalDO,
  without publishing a new worker.
- Agent work sends a prompt through the normal turn loop.

Both agent kinds normally wake the same agent in the conversation where the
automation was requested. A separate topic or an independent long-running job
can use a fresh conversation for each run instead.

Agents launch and edit active definitions. The running pill shows the target,
schedule, end policy, reach, standing permissions, history, and controls.
Schedules use elapsed intervals or five-field cron in an explicit IANA
timezone. An automation can end at a time, after a maximum number of admitted
runs, or when a prompt, eval, or method returns an explicit natural-completion
response.

The **Automations** panel is where you supervise them. It highlights active
runs, completed definitions, and recent failures; offers search, filters, and
paged run history; shows each run's completion response, final message, or
error; and links agent runs to their conversations. Scheduled-activity pills in
chat history open the same definition/tick inspector, with lazily loaded detail
and edit and stop/resume controls.

### Workers (Workerd)

Workers are Cloudflare V8 isolates (via workerd) that run server-side logic.
They support **Durable Objects** for persistent, stateful services. The agent
system itself runs on workers, with DOs for conversation channels and agent
state.

Durable Objects are the normal application database. Each DO instance has its
own SQLite through `this.sql`, and panels, apps, and agents call its declared
service methods through `workers.resolveService(...)` and `rpc.call(...)`. The
eval `db` is private scratch storage for the agent's EvalDO, not a shared app
database.

### Runtime APIs

All panels and sandbox code can import from `@workspace/runtime`:

| API         | What it provides                                     |
| ----------- | ---------------------------------------------------- |
| `fs`        | Filesystem scoped to the context folder              |
| `ai`        | Text generation and streaming (multiple model roles) |
| `workers`   | Resolve worker/DO services, including app databases  |
| `workspace` | Inspect and configure the current workspace          |
| `rpc`       | Call services on the main process or other panels    |

Two more surfaces:

- `browserData` from `@workspace/runtime` imports and exports browser data.
- `@workspace/cdp-client` is the workerd-native CDP client behind
  `handle.cdp.session()`, the only Playwright-style browser-automation API. Reach it
  through the handle; use its exported `CdpConnection` only for protocol-level
  work.

### Build System

Panels and workers are built **on demand**. When you navigate to a panel URL or
create a worker instance, the build system compiles an explicit semantic or
content build source with esbuild. Publishing to protected main first validates
the affected build units and everything that transitively depends on them.
Later builds and activations are derived from that published state.

## Architecture at a Glance

```
┌─────────────────────────────────────────────────┐
│  Electron Host                                  │
│  ┌──────────┐  ┌──────────┐ ┌──────────┐        │
│  │ Chat     │  │ Panel A  │ │ Browser  │  ...   │
│  │ (agent)  │  │          │ │ Panel    │        │
│  └────┬─────┘  └────┬─────┘ └────┬─────┘        │
│       │ WebSocket   │            │              │
│  ┌────┴─────────────┴────────────┴──────┐       │
│  │  Server (RPC, build, VCS, services)  │       │
│  └────┬─────────────────────────────────┘       │
│       │                                         │
│  ┌────┴──────────────────┐                      │
│  │  Workerd (workers/DOs)│                      │
│  └───────────────────────┘                      │
│       │                                         │
│  ┌────┴──────────────────┐                      │
│  │  Semantic VCS graph   │                      │
│  └───────────────────────┘                      │
└─────────────────────────────────────────────────┘
```

- **Panels** connect to the server over WebSocket for RPC
- The **server** handles builds, file access, VCS, external Git interop,
  database, AI proxy, and service routing
- **Workerd** runs workers and Durable Objects in V8 isolates
- The **semantic VCS graph** holds source intent, applications, decisions,
  ancestry, provenance, and content projections in one graph
