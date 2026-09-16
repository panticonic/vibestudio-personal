import { useState, type CSSProperties } from "react";
import { panel, buildPanelLink } from "@workspace/runtime";
import { Choices, Figure, SceneFrame } from "../lib/Scene";
import { createShellSurfaceLink } from "@vibestudio/shared/shellSurface";
import { ApprovalDemo } from "../lib/ApprovalDemo";
import { DemoChatLink } from "../lib/DemoChatLink";
import {
  APP_DEMO_PROMPT,
  AUTOMATION_DEMO_PROMPT,
  WRITING_WORKSPACE_URL,
} from "../lib/demos";
import {
  MessageSurface,
  MessageContent,
  InlineUiSurface,
} from "@workspace/agentic-chat/presentation";
import "@workspace/agentic-chat/styles.css";

function AskAgent({ prompt, label }: { prompt: string; label: string }) {
  const [status, setStatus] = useState<
    "idle" | "opening" | "opened" | "failed"
  >("idle");
  return (
    <div className="tour-action">
      <button
        className="btn"
        type="button"
        disabled={status === "opening"}
        onClick={async () => {
          setStatus("opening");
          try {
            await panel.openCommandAgent({ prompt });
            setStatus("opened");
          } catch {
            setStatus("failed");
          }
        }}
      >
        {status === "opening" ? "Opening…" : label}
      </button>
      <p className="box__sub" role="status">
        {status === "failed"
          ? "Couldn't open the agent. Try again or use this panel's command button."
          : status === "opened"
            ? "Your request is ready. Edit it or send it."
            : "Opens a request. You choose when to send it."}
      </p>
    </div>
  );
}

export function Opening() {
  return (
    <SceneFrame
      eyebrow="01 · Make it yours"
      title={
        <>
          Software you can change <em>by asking.</em>
        </>
      }
      lede="Build tools, adapt them as you work, and keep your agents close to what you're doing."
    >
      <Figure caption="This tour is a workspace panel. You can change it too.">
        <div className="tour-demo">
          <span className="tour-demo__label">Try it on this tour</span>
          <p className="tour-prompt">
            “Make this tour feel like a field guide to my next project.”
          </p>
          <AskAgent
            label="Reshape this tour"
            prompt="Restyle panels/tour as a field guide to my next project. Ask me what the project is first. Keep the tour concise, preserve its capabilities and navigation, and rebuild the panel."
          />
        </div>
      </Figure>
    </SceneFrame>
  );
}

const WORKSPACE_BOUNDARIES = {
  inside: {
    name: "Inside a workspace",
    title: "A whole environment, not just a plugin.",
    detail:
      "A third-party template can bring apps, agents, data, and tools into its own workspace.",
    mechanism:
      "Its authority manifest declares what the code may request—not what it has permission to do. Host capabilities protect privileged operations; workspace-defined capabilities protect an app’s own resources.",
  },
  across: {
    name: "Across the boundary",
    title: "Share a capability. Not the keys to everything.",
    detail:
      "A reading-list app could let another workspace’s agent read one saved list—without permission to edit it or read other lists.",
    mechanism:
      "The receiving service binds the capability to that concrete resource. Access checks use the authenticated caller, executing code, and authority session. A connection or navigation link grants none of this by itself.",
  },
  approval: {
    name: "Who approves?",
    title: "Code can ask. It cannot approve itself.",
    detail:
      "The host enforces approval outside the requesting code. A one-time grant covers one invocation; a session grant lasts for that authority session.",
    mechanism:
      "A version grant is tied to the exact code version: changing the source invalidates it. Critical actions always require fresh approval, never a standing grant.",
  },
};
export function Workspaces() {
  const [selected, setSelected] =
    useState<keyof typeof WORKSPACE_BOUNDARIES>("inside");
  const boundary = WORKSPACE_BOUNDARIES[selected];
  return (
    <SceneFrame
      eyebrow="03 · Capabilities & security"
      title={
        <>
          Rich environments. <em>Explicit trust boundaries.</em>
        </>
      }
      lede="The agentic UI continuum needs a security foundation: rich workspaces for mutually untrusted code and agents, with explicit capabilities controlling privileged access."
    >
      <Figure
        caption={
          selected === "approval"
            ? "Live demo · the button uses the real permission system."
            : "Illustration · explore the boundary, then try a real approval."
        }
      >
        <Choices
          value={selected}
          options={Object.entries(WORKSPACE_BOUNDARIES).map(
            ([value, item]) => ({
              value: value as keyof typeof WORKSPACE_BOUNDARIES,
              label: item.name,
            }),
          )}
          onChange={setSelected}
          label="Workspace boundary"
        />
        <div className="tour-demo" aria-live="polite">
          <h2>{boundary.title}</h2>
          <p>{boundary.detail}</p>
          <p>{boundary.mechanism}</p>
          {selected === "approval" && <ApprovalDemo />}
        </div>
      </Figure>
    </SceneFrame>
  );
}

export function Websites() {
  const [mode, setMode] = useState<"connect" | "install">("connect");
  return (
    <SceneFrame
      eyebrow="04 · Websites & apps"
      title={
        <>
          Connect a website. Or give an app <em>its own workspace.</em>
        </>
      }
      lede="Connect your agents to third-party code through a focused web experience or a full app workspace. Each gets scoped access—not the keys to everything."
    >
      <Figure caption="Illustration · capability access is checked separately from connection.">
        <Choices
          value={mode}
          options={[
            { value: "connect", label: "Connect a website" },
            { value: "install", label: "Install an app workspace" },
          ]}
          onChange={setMode}
          label="Website or installed app"
        />
        <div className="tour-demo" aria-live="polite">
          <span className="tour-demo__label">
            {mode === "connect"
              ? "Inside your current workspace"
              : "A new, dedicated workspace"}
          </span>
          <h2>
            {mode === "connect"
              ? "A little interface. Useful capabilities."
              : "A home for the whole app."}
          </h2>
          <p>
            {mode === "connect"
              ? "First, approve an enabled website’s connection to this workspace. It can then request specific capabilities—not inherit the workspace’s permissions."
              : "An app template brings its software into a separate workspace, with its own data and tools. You review the source when creating it."}
          </p>
          {mode === "install" && (
            <div className="tour-action">
              <a
                className="btn tour-link"
                href={createShellSurfaceLink({
                  kind: "workspace-chooser",
                  sourceUrl: WRITING_WORKSPACE_URL,
                })}
              >
                Try a writing workspace
              </a>
              <p className="box__sub">
                Review Spectrolite, an editable writing app. You choose whether
                to create its workspace and approve its requested access.
              </p>
            </div>
          )}
        </div>
      </Figure>
    </SceneFrame>
  );
}

export function Continuum() {
  const [position, setPosition] = useState(0);
  const [read, setRead] = useState(false);
  const stages = [
    {
      label: "An app",
      title: "Browse it yourself.",
      detail: "Your reading list, with familiar controls.",
    },
    {
      label: "An app + agent",
      title: "Ask while you browse.",
      detail: "The agent works with the list you’re looking at.",
    },
    {
      label: "UI in chat",
      title: "Use the answer.",
      detail: "The same list and checkmark, now inside the conversation.",
    },
  ];
  const stage = Math.round(position);
  const current = stages[stage]!;
  const readingList = (
    <div className="continuum-reading">
      {stage < 2 && (
        <div className="continuum-reading__bar">
          <span className="tour-demo__label">Saved for later</span>
          <span className="continuum-badge">
            {stage === 0 ? "Reading list" : "Under 10 min"}
          </span>
        </div>
      )}
      <label className="continuum-article">
        <input
          type="checkbox"
          checked={read}
          onChange={(event) => setRead(event.target.checked)}
          aria-label="Mark A windowsill garden as read"
        />
        <span>
          <strong>A windowsill garden</strong>
          <small>6 min · Everyday inspiration</small>
        </span>
      </label>
      <div className="continuum-extra" aria-hidden={stage !== 0}>
        <span>A slower way to travel</span>
        <small>18 min</small>
      </div>
    </div>
  );
  return (
    <SceneFrame
      eyebrow="02 · Apps meet agents"
      title={
        <>
          From apps with agents <em>to agents with interfaces.</em>
        </>
      }
      lede="An app doesn’t have to end where a conversation begins. Move along the agentic UI continuum—with your own tools or third-party software, backed by scoped capabilities."
    >
      <Figure caption="Illustration using real chat components · no live agent.">
        <input
          className="continuum-slider"
          type="range"
          min={0}
          max={2}
          step={0.01}
          value={position}
          onChange={(event) => setPosition(Number(event.target.value))}
          aria-label="Position on the agentic UI continuum"
          aria-valuetext={current.label}
        />
        <div
          className="continuum-stops"
          role="group"
          aria-label="Continuum positions"
        >
          {stages.map((item, index) => (
            <button
              type="button"
              key={item.label}
              aria-pressed={stage === index}
              onClick={() => setPosition(index)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div
          className="continuum-example agentic-chat-root"
          data-stage={stage}
          style={
            {
              "--conversation": Math.min(1, position),
              "--inline": Math.max(0, position - 1),
            } as CSSProperties
          }
        >
          <div className="continuum-question" aria-hidden={stage === 0}>
            <MessageSurface role="player">
              <span className="tour-demo__label">You</span>
              <MessageContent
                content="What’s a good read for my coffee break?"
                isStreaming={false}
              />
            </MessageSurface>
          </div>
          {stage < 2 && readingList}
          <div className="continuum-agent" aria-hidden={stage === 0}>
            <MessageSurface role="agent">
              <span className="tour-demo__label">Agent</span>
              <MessageContent
                content={
                  stage === 2
                    ? "Here’s one from your list. Mark it read right here."
                    : "Try the windowsill garden piece. It fits your break."
                }
                isStreaming={false}
              />
              {stage === 2 && (
                <InlineUiSurface subtitle="Your reading list">
                  {readingList}
                </InlineUiSurface>
              )}
            </MessageSurface>
          </div>
        </div>
        <div className="continuum-explanation" aria-live="polite">
          <h2>{current.title}</h2>
          <p>{current.detail}</p>
        </div>
      </Figure>
      <DemoChatLink
        title="Reshape Bookmarks"
        label="Watch an agent change an app"
        prompt={APP_DEMO_PROMPT}
        hint="Opens a full chat and asks your agent to restyle Bookmarks in a child panel, commit locally, then rebuild it. Main stays unchanged; no bookmark data is edited."
      />
    </SceneFrame>
  );
}

export function Automations() {
  return (
    <SceneFrame
      eyebrow="05 · Automations"
      title={
        <>
          Ask once. <em>Let it repeat.</em>
        </>
      }
      lede="Turn recurring work into an automation, with a schedule and scope you can inspect."
    >
      <Figure caption="Live workflow · run once, inspect the result, then choose whether to repeat.">
        <div className="tour-demo">
          <span className="tour-demo__label">Project pulse</span>
          <p className="tour-prompt">
            “Check what’s changed in this branch. Run it once so I can see what
            I’ll get.”
          </p>
          <p>
            A real read-only check, with a saved definition and run history.
            Start on demand; add a schedule only when it’s useful.
          </p>
          <DemoChatLink
            title="Try an automation"
            label="Run a project pulse"
            prompt={AUTOMATION_DEMO_PROMPT}
            hint="Opens a full chat and asks your agent to create a manual automation and run it once. Results and controls appear there. Nothing repeats unless you ask."
          />
        </div>
      </Figure>
      <a
        className="tour-link"
        href={buildPanelLink("about/automations", {
          workspace: { role: "system" },
        })}
      >
        Explore automations ↗
      </a>
    </SceneFrame>
  );
}

export function Closing() {
  return (
    <SceneFrame
      eyebrow="06 · Your first tool"
      title={
        <>
          Start with something <em>you wish existed.</em>
        </>
      }
      lede="A small tool for your day. A workspace for a project. An app that works the way you do."
    >
      <Figure>
        <div className="tour-demo">
          <p className="tour-prompt">
            “Help me build a tool for something I do every week.”
          </p>
          <a
            className="btn tour-link"
            href={buildPanelLink("panels/chat", {
              disposition: "root",
              placement: { disposition: "side-if-room" },
              title: "Your first tool",
              stateArgs: {
                initialPrompt:
                  "Help me build a small useful tool in this workspace for something I do every week. Ask me what that task is first, then propose the simplest useful version.",
              },
            })}
          >
            Make my first tool
          </a>
          <p className="box__sub">
            Opens a full chat and sends this request to get you started.
          </p>
        </div>
      </Figure>
      <p className="scene__aside">Your software, shaped around your work.</p>
    </SceneFrame>
  );
}
