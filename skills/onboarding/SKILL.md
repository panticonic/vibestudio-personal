---
name: onboarding
description: Open the state-aware setup overview, route selections to owner workflows, refresh state, or add a separate workspace.
---

# Onboarding

Onboarding shows the state each capability owner reports. It keeps no
completion flags, does not infer permissions, and does not turn features into a
checklist.

## Welcome conversation

The shipped chat declares `stateArgs.seed`: an authored welcome message with a
`<Video>` and a retained `openingRequest`. The welcome is real conversation
history and can display before model credentials are connected. It is installed
once, when the channel is created; reopening or forking the chat never replays
onboarding actions. Do not resend the welcome or the video. After the opening
request arrives, give a short next step and open the overview below.

## Open the overview

```text
inline_ui({
  id: "onboarding-setup-overview",
  path: "skills/onboarding/SetupHub.tsx",
  props: {}
})
```

Don't build a snapshot first or pass private state as props. The component
renders from its panel cache immediately, then reads each capability owner's
state. If one owner read fails, that row shows as unknown or unavailable; the
other rows still render.

**Add workspace** opens the shell-owned creation surface for a folder, URL,
website deep link, or validated local checkout. The client owns the review step;
it is not an onboarding interaction command. Creation makes a separate
workspace. Keep this conversation in its current workspace; the new source is
not added to this conversation's context. See
[workspace creation](../templates/references/workspace-creation.md) for website
links, development checkouts, and recovering an interrupted creation. Local
sources use the snapshot the host captured; do not re-fetch unpublished pins.
After an explicit source copy or merge, check the destination's VCS state before
saying the changes are available there.

## Route a selection

The component routes each click itself. About pages, panels, and shell
surfaces open directly from the user's click and never reach the
conversation.

Standard About pages open in their owning workspace: saved credentials,
downloads, bookmarks, and history belong to Personal; permissions, local model
configuration, help, and system information belong to System. `about/new` is
the exception and stays in the current workspace. Catalog actions name such a
page as an `about-page` target, never as a same-named panel path.

A selection that an agent workflow owns arrives as a message with readable text
plus two metadata fields: `interaction` (the capability `targetId` and
`action`) and `selection`, the routed result. `selection.target.via` is
`owner-skill`, `model-settings`, or `conversation`, and
`selection.ownerSkillPath` names the owner skill when there is one. Follow that
target; don't match button text or invent a fallback, and don't re-run the
route in `client_eval`.

**Schedule recurring work** is a ready-now conversation route owned by
[Automations](../automations/SKILL.md). Read that skill, ask only for the
details needed to choose between a worker method, an inline agent eval, or an
agent prompt, and launch the automation. Small recurring scripts can use the
built-in agent/EvalDO path without publishing a new codebase. Use either an
elapsed interval or a cron schedule with an explicit timezone, and capture any
end time, maximum run count, and natural-completion behavior. Agents can later
edit, run, pause, resume, or retire the automation when the user asks; a saved
edit takes effect immediately.

A successful launch immediately appears at that point in the conversation as a
running pill. The user can open it to inspect, edit, pause, run, or stop the
definition before the first tick; it is the same definition shown in
Automations. Do not open an empty supervision panel instead of helping.

## Update assistant preferences

The Workspace update assistant row reads the user's actual automation state.
Monitoring is set up automatically, so it never counts as unfinished
onboarding. When the user wants to change it, read the templates skill's
[workspace-updates reference](../templates/references/workspace-updates.md),
inspect `templates.updateAssistant()`, and ask whether to change the frequency,
pause, or resume. Edit that existing automation. If the user stopped
monitoring, respect that and do not recreate it while welcoming them. If the
status read is missing or failed, do not describe monitoring as active.

## Refresh

The component has its own check and refresh controls. After setup succeeds,
fails, is cancelled, or changes outside the conversation, render the same
component ID again with no snapshot props. Report what you did, but don't state
a row's new state until the component has read it.

## Product rules

- Show preparation that persists, not every capability that is ready on demand.
- Present optional configuration neutrally; don't show "N of M complete" counts.
- A connected status does not authorize effects. Send repair, credentials,
  model settings, and grants to the surface that owns them.
- Secrets go through the host's credential input, never through chat or inline
  props.
- Open one owner workflow per selection. Don't replace it with feedback
  questions or a custom approval UI.
- Recurring work is a capability the agent can use immediately, not a setup
  step. Automations owns schedules, execution, history, and supervision.
- The shell owns source inspection and workspace creation.

Read [GETTING_STARTED.md](GETTING_STARTED.md) for the execution recipe,
[OVERVIEW.md](OVERVIEW.md) for product concepts, and
[REMOTE_SERVER.md](REMOTE_SERVER.md) for remote setup.
