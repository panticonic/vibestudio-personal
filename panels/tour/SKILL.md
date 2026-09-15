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
concrete copy and generous spacing. Put technical qualifications in presenter
notes rather than adding more cards. Label examples as illustrations.
Do not present adjustable numbers as measured performance or simulated
permissions as live approvals.

## Source

- `deck.ts`: scene order, short navigation labels, and presenter notes.
- `scenes/ProductTour.tsx`: the six compact scene components and their shared
  agent action. Requests open the panel's real command conversation, unsent.
- `lib/Scene.tsx`: shared frame, figure, and accessible choice controls.
- `lib/Tangle.tsx`: keyboard-accessible draggable numbers.
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

Use the existing panel command conversation for real requests. For navigation,
use `buildPanelLink` from `@workspace/runtime`: for example,
`buildPanelLink("about/automations", { workspace: { role: "system" } })`.
This selects the user's System workspace without knowing its ID or name.
Do not broaden authority for illustrations.

## Verification

Run `deck.test.ts` and `lib/schedule.test.ts` through the host's Personal
userland test configuration. Inspect every scene at phone and desktop widths
in light and dark themes; check overflow, navigation, choices, and the time
control's arrow keys. Preview host stubs can verify layout and local behavior,
but do not establish live command delivery or persisted state.

Before publishing, open the panel from the exact context
(`openPanel("panels/tour", { contextId, ref: "ctx:<id>" })`) and verify it
visually in its actual host, including a real command-conversation action.
