# Getting started

The first-run chat opens directly in the transcript. The agent reads
[SKILL.md](SKILL.md), gives a short welcome, and renders
[SetupHub.tsx](SetupHub.tsx) inline with the stable ID
`onboarding-setup-overview`. The component shows its panel-scope cache and
refreshes each capability owner's state on mount. Onboarding does not install an
action bar.

## Run the setup projection

Render the setup hub by path, with no preceding `client_eval` and no snapshot
props. In a client that cannot show panels, briefly summarize the blocking and
needs-attention states and say that everything else is optional. If the owner
of a capability shipped in Base is missing, report the capability as
unavailable, not as something to install.

The component loads installed capability definitions and statuses itself.
**Add workspace** opens the client's workspace creation surface, including local
candidates selected with `--template-checkout`. The host inspects and acquires
those candidates; do not inspect a local candidate through its remote Git URL.
Creating a workspace leaves the Personal onboarding conversation where it is.

## Handle a choice

The component routes a click through `executeOnboardingSelection`. The user's
click opens validated About, panel, and shell routes directly; panel navigation
focuses the destination and waits for it to report ready, and the card itself
reports a panel that did not confirm readiness. None of these reach the agent.

A route owned by an agent workflow arrives as a user message whose metadata
carries the `interaction` object and its routed `selection`. Follow
`selection.target` (and `selection.ownerSkillPath` when present). The visible
sentence is for people and transcript replay, not for dispatch.

Each owner's workflow decides what happens next:

- Google and GitHub setup and checks use their own skill helpers.
- Browser migration uses `extensions/browser-data/SKILL.md`.
- Alternative search setup uses `skills/web-research/SKILL.md`. Codex agents use
  subscription search; other agents use DuckDuckGo with no setup.
- Recurring worker methods, inline agent evals, and agent prompts use
  `skills/automations/SKILL.md`. Help the user shape and launch the definition;
  its chat pill provides inspection and controls.
- Model/provider and agent-default changes use model settings.
- Device and remote controls open the typed shell connection surface.
- Credential inspection and revocation, and agent grants, each open their own
  About page.

The client runs from the signed-in user's private System workspace and shows
that user's private Personal workspace alongside shared workspaces. Workspace
membership uses explicit `admin` and `member` roles. These are separate from the
account's `accountRole` and do not make Personal or System shareable.

The component runs refresh and connection checks itself and caches the result in
panel scope. After any external workflow finishes, render the setup hub by path
with the same stable ID and no snapshot props. This replaces the card and bumps
its render revision, which triggers a fresh owner read.

## Continue from intent

Ready-now choices start work directly. For example, choosing PDFs asks for the
document or starts an ingestion task; it never creates a PDF setup flow.
Likewise, **Schedule recurring work** starts the Automations workflow:

1. Choose a deterministic method, a model-free inline eval in an existing agent,
   or an agent prompt.
2. Choose an interval or a timezone-aware cron schedule, plus any end time,
   run limit, or natural-completion condition.
3. Resolve the target and launch it.

The user can then inspect and control it from the running chat pill or the
Automations panel. Opening the panel by itself does not complete the request.

Show channel and project configuration only when the user picks that channel or
project goal.

Use the owner's trusted workflow UI for OAuth, credential entry, browser
imports, and other side effects. A self-contained setup workflow uses
`inline_ui` and calls its trusted helpers directly; it does not hand choices
back to the agent to translate into eval code. Use `feedback_custom` only when
the agent needs structured input for later reasoning. One setup selection gets
one owner workflow. Do not chain small feedback forms for access, provider,
browser, or permission choices that can be shown together or filled from a
recommended default.

Template inspection reviews the source for a new workspace. It does not apply
trust or provider settings to the current workspace. Any unit or capability
that the new workspace admits goes through that workspace's protected approval
flow. Do not duplicate that approval in `feedback_custom`, chat, inline UI, or
an action bar.
