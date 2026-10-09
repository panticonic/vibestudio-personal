---
name: tour-panel
description: Extend or restyle the concise Vibestudio product tour.
---

# Vibestudio Tour

The tour introduces six ideas: editable software, the agentic UI continuum,
separate workspaces, connected websites versus installed app workspaces,
recurring work, and creating a first tool.

State the motivation on screen, not only in presenter notes: apps with agents
and agents with interfaces form a continuum that includes third-party code, and
workspace boundaries plus scoped capabilities are what make that integration
safe. Do not suggest that navigating somewhere grants access.

## Design

- One idea and one main interactive figure per scene.
- Short, concrete copy and generous spacing.
- Explain core security mechanics on the slide; put edge cases in presenter
  notes.
- Label illustrative and live examples differently.
- Use button-like styling only for real controls; drop decorative labels that
  repeat the surrounding copy.
- Do not present adjustable numbers as measured performance, or simulated
  permissions as live approvals.

## Source

- `deck.ts`: the single scene registry. Order, rail labels, numbered eyebrows,
  and presenter notes all derive from it.
- `scenes/ProductTour.tsx`: the six compact scene components and
  `SCENE_COMPONENTS`, keyed by deck id (its type requires one per scene). The
  reshape action opens the tour's command conversation with an unsent prompt;
  creating a first tool opens a full chat panel whose initial prompt is sent on
  connection.
- `lib/Scene.tsx`: shared frame, figure, and accessible choice controls.
- `lib/DemoChatLink.tsx` and `lib/demos.ts`: full-chat links and the user
  requests for live app editing and a run-once automation.
- `lib/ApprovalDemo.tsx`: a real protected read from `workers/tour-sample`.
  Every click calls the receiver again; local UI state never stands in for a
  grant.
- `index.tsx`: persisted scene and notes, host commands, keyboard navigation,
  presentation mode, and Back/Next controls for all screen sizes.
- `tour.css`: responsive layout using Radix/foundation tokens.

Scene IDs are persisted and public. An unknown ID returns to the opening scene.
To add or reorder a scene, edit `DECK` and add its component to
`SCENE_COMPONENTS`; never hand-write scene numbers. `useAgentState("tour", …)`
exposes the current position to agents. Scene and notes persist; presentation
mode and key help do not.

## Claims and actions

Connected websites request access in the workspace where they are viewed, and
consenting to a connection does not grant every capability. Installed app
templates create dedicated workspaces with reviewed source. Keep the two
distinct. Some provider configuration and host settings are shared across
workspaces.

Reshape this tour through the panel's command conversation. The closing action
starts a full chat with
`buildPanelLink("panels/chat", { disposition: "root", stateArgs: { seed: { openingRequest } } })`;
tell the user that the prompt is sent on connection. For navigation, use
`buildPanelLink` from `@workspace/runtime`, for example
`buildPanelLink("about/automations", { workspace: { role: "system" } })`. This
selects the user's System workspace without knowing its ID or name.

The app-editing action opens a child chat. Its agent opens the existing
`about/bookmarks` in the same conversation context with `ref: ctx:<id>`, edits
the source, verifies and commits locally, then rebuilds that child. It must not
publish the edit, scaffold a replacement app, or change bookmark data. An
unpublished context is a branch, not a separate workspace with its own security
boundary.

The template action uses `createShellSurfaceLink` to prefill Spectrolite's
source URL in the normal workspace review. It neither creates nor approves the
workspace. The automation action asks an agent to launch a manual Project pulse
and run it once with the native automation tools. The chat pill shows live
results and controls; don't add a tour scheduler or fake results. No recurring
trigger is installed unless the user asks for one afterwards.

The approval demo reads only a fictional, constant sample through the declared
`vibestudio.tour-sample.v1` service. Installed panels use once/version grants,
so a permission accepted at install time can already cover the first click.
Keep the normal grant and denial flow. Never revoke grants to force a prompt,
and never infer grant reuse from response speed. Illustrations need no
permissions; live actions go through the normal agent and host permission
paths.

## Verification

- Run the manifest-declared browser suite with
  `verify({ operation: "test", target: "panels/tour", suite: "browser" })`; use
  `file` for a focused test. Do not run Vitest from the shell: the panel suite
  runs in its production browser runtime and imports primitives from
  `@workspace/test-runtime`.
- Inspect every scene at phone and desktop widths in light and dark themes.
  Check overflow, navigation, choices, and the continuum slider's arrow keys.
- Run `lib/ApprovalDemo.browser.test.tsx` and the sample worker tests. In an
  isolated host, verify a real approval, repeat access after a version grant,
  and denial. Preview host stubs can check layout and local behavior but not
  live command delivery or persisted state.
- For app editing, verify the local commit, an unchanged main, and the child
  panel's context/build provenance.
- For automation, verify a real completed manual run and that no next run is
  scheduled.
- Template links must keep source review and consent.

Before publishing, open the panel from its context
(`openPanel("panels/tour", { contextId, ref: "ctx:<id>" })`) and check it
visually in its real host, including a real command-conversation action.
