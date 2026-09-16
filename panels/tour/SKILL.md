---
name: tour-panel
description: Extend or restyle the concise Vibestudio product tour.
---

# Vibestudio Tour

The tour introduces six ideas: editable software, the agentic UI continuum,
separate workspaces, connected websites versus installed app workspaces,
recurring work, and creating a first tool.

Make the motivation explicit: apps with agents and agents with interfaces form
a continuum that includes third-party code. Workspace boundaries and scoped
capabilities enable that integration. Keep this connection visible in the tour,
not only in presenter notes; do not imply that navigation grants authority.

## Design

Keep one idea and one main interactive figure per scene. Use short,
concrete copy and generous spacing. Explain core security mechanics on-slide;
keep edge cases in presenter notes. Label illustrative and live examples distinctly.
Reserve button-like styling for actual controls; omit decorative labels that
repeat the surrounding copy.
Do not present adjustable numbers as measured performance or simulated
permissions as live approvals.

## Source

- `deck.ts`: scene order, short navigation labels, and presenter notes.
- `scenes/ProductTour.tsx`: the six compact scene components. Reshaping opens
  the tour's command conversation, unsent; creating a first tool opens a full
  chat panel with an initial prompt that is sent on connection.
- `lib/Scene.tsx`: shared frame, figure, and accessible choice controls.
- `lib/DemoChatLink.tsx` and `lib/demos.ts`: ordinary full-chat links and the
  user requests for live app editing and a run-once automation.
- `lib/ApprovalDemo.tsx`: a real protected read from `workers/tour-sample`.
  Every click calls the receiver again; local UI state never represents a grant.
- `index.tsx`: persisted scene/notes, host commands, keyboard navigation,
  presentation mode, and Back/Next controls shared across screen sizes.
- `tour.css`: responsive layout using Radix/foundation tokens.

Scene ids are public persisted state. Unknown ids return to the opening.
Keep the deck registry, component switch, and numbered eyebrows aligned.
`useAgentState("tour", …)` exposes the current position to agents.
Scene and notes persist; presentation mode and key help are ephemeral.

## Claims and actions

Connected websites request access in the workspace where they are viewed.
Connection consent does not grant every capability. Installed app templates
create dedicated workspaces with reviewed source. Do not conflate the two.
Some provider configuration and host settings are shared across workspaces.

Use the panel command conversation for reshaping this tour. The closing action
uses `buildPanelLink("panels/chat", { disposition: "root", stateArgs: { initialPrompt } })`
to start a full chat; disclose that the prompt is sent on connection. For navigation,
use `buildPanelLink` from `@workspace/runtime`: for example,
`buildPanelLink("about/automations", { workspace: { role: "system" } })`.
This selects the user's System workspace without knowing its ID or name.

The app-editing action opens a child chat. Its agent opens existing
`about/bookmarks` in the same conversation context with `ref: ctx:<id>`, edits
source, verifies and commits locally, then rebuilds that child. Do not publish
the edit, scaffold a substitute app, or mutate bookmark data. An unpublished
context is a branch, not a separate workspace security boundary.

The template action uses `createShellSurfaceLink` to prefill Spectrolite's
source URL in the normal workspace review. It does not create or approve it.
The automation action asks an agent to launch a manual Project pulse and run
it once through native automation tools. The ordinary chat pill owns live
results and controls; don't add a tour scheduler or synthesize results. No
recurring trigger is installed without a subsequent user request.

The approval demo reads only a fictional, constant sample through the declared
`vibestudio.tour-sample.v1` service. Installed panels use once/version grants;
accepting its permission at install can already authorize the first click.
Preserve ordinary acquisition and denial; never revoke grants to manufacture a
prompt or infer grant reuse from response speed. Illustrations need no
authority; live actions keep the ordinary agent and host permission paths.

## Verification

Run `deck.test.ts` and `scenes/ProductTour.test.tsx` through the host's Personal
userland test configuration. Inspect every scene at phone and desktop widths
in light and dark themes; check overflow, navigation, choices, and the continuum
slider's arrow keys. Run `lib/ApprovalDemo.test.tsx` and the sample worker tests.
Verify real approval, repeat access after a version grant, and denial in an
isolated host. Preview host stubs can verify layout and local behavior,
but do not establish live command delivery or persisted state.
For app editing, verify the local commit, unchanged main, and the child panel's
context/build provenance. For automation, verify a real completed manual run
and no next scheduled run. Template links must retain source review and consent.

Before publishing, open the panel from the exact context
(`openPanel("panels/tour", { contextId, ref: "ctx:<id>" })`) and verify it
visually in its actual host, including a real command-conversation action.
