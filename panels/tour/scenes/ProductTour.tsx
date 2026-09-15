import { useState } from "react";
import { panel, buildPanelLink } from "@workspace/runtime";
import { Choices, Figure, SceneFrame } from "../lib/Scene";
import { Tangle } from "../lib/Tangle";

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

const SPACES = {
  personal: {
    name: "Personal",
    detail: "Your everyday tools, in one familiar place.",
    tools: ["Reading list", "Weekly planner", "Notes"],
  },
  project: {
    name: "Project",
    detail: "A focused environment for the thing you're making.",
    tools: ["Task board", "Research", "Project agent"],
  },
  app: {
    name: "An app's own space",
    detail: "A dedicated home for an installed app and its data.",
    tools: ["App", "App data", "App conversations"],
  },
};
export function Workspaces() {
  const [selected, setSelected] = useState<keyof typeof SPACES>("personal");
  const space = SPACES[selected];
  return (
    <SceneFrame
      eyebrow="03 · Workspaces"
      title={
        <>
          A separate space for <em>each part of your life.</em>
        </>
      }
      lede="Bring agents and third-party software together without giving everything the same access. Workspaces separate tools, data, and conversations; capabilities control what code can do."
    >
      <Figure caption="Illustration · example workspaces, not your account.">
        <Choices
          value={selected}
          options={Object.entries(SPACES).map(([value, item]) => ({
            value: value as keyof typeof SPACES,
            label: item.name,
          }))}
          onChange={setSelected}
          label="Example workspace"
        />
        <div className="tour-demo" aria-live="polite">
          <h2>{space.name}</h2>
          <p>{space.detail}</p>
          <div className="tour-tools">
            {space.tools.map((tool) => (
              <span key={tool}>{tool}</span>
            ))}
          </div>
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
      <Figure caption="Illustration · connection and capability access are separate approvals.">
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
              ? "An enabled website can request workspace capabilities. You decide what access to allow."
              : "An app template brings its software into a separate workspace, with its own data and tools. You review the source when creating it."}
          </p>
          <div className="tour-tools">
            {(mode === "connect"
              ? ["Enabled website", "Your approval", "Workspace capabilities"]
              : ["App template", "Your review", "New workspace"]
            ).map((text) => (
              <span key={text}>{text}</span>
            ))}
          </div>
        </div>
      </Figure>
    </SceneFrame>
  );
}

export function Continuum() {
  const [view, setView] = useState<"app" | "agent" | "chat">("app");
  return (
    <SceneFrame
      eyebrow="02 · Apps meet agents"
      title={
        <>
          From apps with agents <em>to agents with interfaces.</em>
        </>
      }
      lede="This is the agentic UI continuum: a full app, an agent working inside it, or an interactive tool inside a conversation. Mix them to fit the task—including with third-party software."
    >
      <Figure caption="Illustration · one task, three ways to work.">
        <Choices
          value={view}
          options={[
            { value: "app", label: "Use the app" },
            { value: "agent", label: "Ask its agent" },
            { value: "chat", label: "Work in chat" },
          ]}
          onChange={setView}
          label="Ways to work"
        />
        <div className="tour-demo" aria-live="polite">
          <span className="tour-demo__label">Plan a launch</span>
          {view === "app" ? (
            <>
              <h2>Your plan, at a glance.</h2>
              <div className="tour-tools">
                <span>Draft the announcement</span>
                <span>Review the demo</span>
                <span>Publish the launch page</span>
              </div>
            </>
          ) : view === "agent" ? (
            <>
              <p className="tour-prompt">“What's left before we can launch?”</p>
              <p>
                An agent can use the state and tools the app exposes to help
                with the work in front of you.
              </p>
            </>
          ) : (
            <>
              <h2>The answer can be something you use.</h2>
              <p>
                A checklist, chart, or form can appear right in the
                conversation.
              </p>
              <label className="tour-check">
                <input type="checkbox" /> Review the demo
              </label>
            </>
          )}
        </div>
      </Figure>
    </SceneFrame>
  );
}

export function Automations() {
  const [hour, setHour] = useState(9);
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
      <Figure caption="Illustration · changing this time does not schedule a task.">
        <div className="tour-demo">
          <span className="tour-demo__label">A morning briefing</span>
          <p className="tour-prompt">
            “Every day at{" "}
            <Tangle
              value={hour}
              min={0}
              max={23}
              onChange={setHour}
              format={(h) => String(h).padStart(2, "0") + ":00"}
              label="Example briefing hour"
            />
            , summarize what's changed in my project.”
          </p>
          <p>
            See what runs, check its activity, and pause it when you need to.
          </p>
        </div>
      </Figure>
      <a
        className="btn tour-link"
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
          <AskAgent
            label="Make my first tool"
            prompt="Help me build a small useful tool in this workspace for something I do every week. Ask me what that task is first, then propose the simplest useful version."
          />
        </div>
      </Figure>
      <p className="scene__aside">Your software, shaped around your work.</p>
    </SceneFrame>
  );
}
