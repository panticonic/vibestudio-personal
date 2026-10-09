// @vitest-environment jsdom

import { fireEvent, render, waitFor } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { lintRendererSource } from "@workspace/agentic-core";
import SetupHub from "./SetupHub.js";
import type { SetupCapabilitySnapshot } from "./snapshot.js";
import {
  onboardingCatalog,
  type OnboardingCapabilityDefinition,
} from "./catalog.js";

const loaders = vi.hoisted(() => ({
  capabilities: vi.fn(),
  execute: vi.fn(),
  observe: vi.fn(),
  changed: () => {},
}));

vi.mock("./observation.js", () => ({
  openSetupObservation: loaders.observe,
}));

vi.mock("./snapshot.js", () => ({
  composeOnboardingCapabilities: loaders.capabilities,
}));

vi.mock("./execution.js", () => ({
  executeOnboardingSelection: loaders.execute,
}));

const googleCapability: OnboardingCapabilityDefinition = {
  id: "connection.google-workspace",
  title: "Google Workspace",
  summary: "Connect Google Workspace.",
  category: "connections",
  role: "connection",
  scope: "user-workspace",
  tier: "direct",
  ownerSkillPath: "skills/google-workspace/SKILL.md",
  actions: { check: { via: "owner-skill" } },
  visibility: "primary",
  setup: { statusAdapter: "google", successDescription: "Verified live." },
};
const catalog = [...onboardingCatalog, googleCapability];

const observedAt = new Date().toISOString();
const snapshots: SetupCapabilitySnapshot[] = [
  {
    id: "connection.google-workspace",
    state: "connected-unverified",
    verification: "unverified",
    summary: "Connected; not checked live.",
    scope: "user-workspace",
    tier: "direct",
    attention: "none",
    nextAction: "check",
    observedAt,
  },
  {
    id: "connection.device",
    state: "connected",
    summary: "This device is paired.",
    scope: "device",
    tier: "host-topology",
    attention: "none",
    nextAction: "setup",
    observedAt,
  },
];

function setupScope(
  options: {
    catalog?: readonly OnboardingCapabilityDefinition[];
    snapshot?: SetupCapabilitySnapshot[];
  } = {},
): Record<string, unknown> {
  return {
    onboardingSetupOverview: {
      catalog: options.catalog ?? catalog,
      snapshot: options.snapshot ?? snapshots,
    },
  };
}

beforeEach(() => {
  loaders.observe.mockReset().mockImplementation((changed) => {
    loaders.changed = changed;
    return {
      ready: Promise.resolve(),
      completion: new Promise(() => {}),
      close: vi.fn(async () => undefined),
    };
  });
  loaders.capabilities.mockReset();
  loaders.capabilities.mockResolvedValue({ catalog, snapshot: snapshots });
  loaders.execute.mockReset();
});

describe("SetupHub", () => {
  it("uses only renderer-safe imports", () => {
    const source = readFileSync(resolve(__dirname, "SetupHub.tsx"), "utf8");
    expect(lintRendererSource(source)).toEqual([]);
  });

  it("separates setup state from ready-now capabilities", async () => {
    const view = render(
      <Theme>
        <SetupHub scope={setupScope()} chat={{ send: vi.fn() }} />
      </Theme>,
    );
    expect(view.getByText("Google Workspace")).toBeTruthy();
    expect(view.getByRole("button", { name: "Ingest PDFs" })).toBeTruthy();
    expect(
      view.getByRole("button", { name: "Schedule recurring work" }),
    ).toBeTruthy();
    expect(view.queryByText(/PDF.*Not configured/i)).toBeNull();
    expect(view.getByText(/not unfinished setup/i)).toBeTruthy();
    await waitFor(() => expect(view.getByText("Refresh")).toBeTruthy());
  });

  it("sends recurring-work intent with its stable catalog identity and route", async () => {
    const selection = {
      handled: false,
      target: { via: "conversation" },
      ownerSkillPath: "skills/automations/SKILL.md",
    };
    loaders.execute.mockResolvedValue(selection);
    const send = vi.fn(async () => undefined);
    const view = render(
      <Theme>
        <SetupHub scope={setupScope()} chat={{ send }} />
      </Theme>,
    );

    fireEvent.click(
      view.getByRole("button", { name: "Schedule recurring work" }),
    );

    await waitFor(() =>
      expect(send).toHaveBeenCalledWith("Explore Schedule recurring work", {
        metadata: {
          interaction: {
            source: "onboarding-setup-hub",
            kind: "onboarding-capability",
            action: "explore",
            targetId: "capability.automations",
          },
          selection,
        },
      }),
    );
  });

  it("opens client-owned routes itself without messaging the agent", async () => {
    loaders.execute.mockResolvedValue({
      handled: true,
      target: {
        via: "shell-navigation",
        target: { kind: "settings", section: "devices" },
      },
    });
    const send = vi.fn(async () => undefined);
    const view = render(
      <Theme>
        <SetupHub scope={setupScope()} chat={{ send }} />
      </Theme>,
    );

    const setup = view.getByRole("button", {
      name: "Set up",
    }) as HTMLButtonElement;
    await waitFor(() => expect(setup.disabled).toBe(false));
    fireEvent.click(setup);

    await waitFor(() =>
      expect(loaders.execute).toHaveBeenCalledWith({
        source: "onboarding-setup-hub",
        kind: "onboarding-capability",
        action: "setup",
        targetId: "connection.device",
      }),
    );
    await waitFor(() => expect(setup.disabled).toBe(false));
    expect(send).not.toHaveBeenCalled();
  });

  it("reports a missing base owner without inventing an install action", async () => {
    const unavailableMobile: SetupCapabilitySnapshot[] = [
      {
        id: "connection.device",
        state: "unavailable",
        summary:
          "Device setup is unavailable because its base capability owner could not be loaded.",
        scope: "device",
        tier: "host-topology",
        attention: "blocking",
        observedAt,
      },
    ];
    loaders.capabilities.mockResolvedValue({
      catalog,
      snapshot: unavailableMobile,
    });
    const view = render(
      <Theme>
        <SetupHub
          scope={setupScope({ snapshot: unavailableMobile })}
          chat={{ send: vi.fn() }}
        />
      </Theme>,
    );

    expect(view.getByText("Unavailable")).toBeTruthy();
    expect(view.queryByRole("button", { name: /Add Devices/i })).toBeNull();
    await waitFor(() => expect(view.getByText("Refresh")).toBeTruthy());
  });

  it("checks a connection directly and refreshes the cached owner state", async () => {
    const send = vi.fn(async () => undefined);
    const view = render(
      <Theme>
        <SetupHub scope={setupScope()} chat={{ send }} />
      </Theme>,
    );

    const check = view.getByRole("button", {
      name: "Check connection",
    }) as HTMLButtonElement;
    await waitFor(() => expect(check.disabled).toBe(false));
    loaders.capabilities.mockClear();
    fireEvent.click(check);

    await waitFor(() =>
      expect(loaders.capabilities).toHaveBeenCalledWith({
        verifyCapabilityId: "connection.google-workspace",
      }),
    );
    expect(send).not.toHaveBeenCalled();
    expect(view.getByText("Connected · not checked")).toBeTruthy();
  });

  it("refreshes capabilities on mount and on a stable-card rerender", async () => {
    const scope: Record<string, unknown> = {
      onboardingSetupOverview: { catalog, snapshot: snapshots },
    };
    const save = vi.fn(async () => undefined);
    const view = render(
      <Theme>
        <SetupHub
          chat={{ send: vi.fn() }}
          scope={scope}
          scopes={{ save }}
          inlineUi={{ id: "onboarding-setup-overview", renderedAt: "first" }}
        />
      </Theme>,
    );

    await waitFor(() => expect(loaders.capabilities).toHaveBeenCalledTimes(1));
    view.rerender(
      <Theme>
        <SetupHub
          chat={{ send: vi.fn() }}
          scope={scope}
          scopes={{ save }}
          inlineUi={{ id: "onboarding-setup-overview", renderedAt: "second" }}
        />
      </Theme>,
    );
    await waitFor(() => expect(loaders.capabilities).toHaveBeenCalledTimes(2));
    expect(save).toHaveBeenCalled();
  });

  it("offers one direct Add workspace route", async () => {
    const view = render(
      <Theme>
        <SetupHub scope={setupScope()} chat={{ send: vi.fn() }} />
      </Theme>,
    );
    const link = await view.findByRole("link", { name: "Add workspace" });
    expect(link.getAttribute("href")).toBe(
      "vibestudio://surface?v=1&kind=workspace-chooser",
    );
    expect(
      view.queryByText(/featured workspaces|workspace catalog/i),
    ).toBeNull();
  });
});

it("admits the owner observations before reading and retains invalidations during a read", async () => {
  let admit!: () => void;
  const ready = new Promise<void>((resolve) => {
    admit = resolve;
  });
  const close = vi.fn(async () => undefined);
  loaders.observe.mockImplementation((changed) => {
    loaders.changed = changed;
    return { ready, completion: new Promise(() => {}), close };
  });
  const view = render(
    <Theme>
      <SetupHub chat={{ send: vi.fn() }} scope={setupScope()} />
    </Theme>,
  );
  expect(loaders.capabilities).not.toHaveBeenCalled();
  admit();
  await waitFor(() => expect(loaders.capabilities).toHaveBeenCalledTimes(1));
  let finish!: (value: unknown) => void;
  loaders.capabilities.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  loaders.changed();
  await waitFor(() => expect(loaders.capabilities).toHaveBeenCalledTimes(2));
  loaders.changed();
  loaders.changed();
  finish({ catalog, snapshot: snapshots });
  await waitFor(() => expect(loaders.capabilities).toHaveBeenCalledTimes(3));
  view.unmount();
  expect(close).toHaveBeenCalledTimes(1);
});

it("keeps observation failures visible until the user retries the live updates", async () => {
  let fail!: (error: unknown) => void;
  const completion = new Promise<void>((_resolve, reject) => {
    fail = reject;
  });
  loaders.observe.mockImplementationOnce(() => ({
    ready: Promise.resolve(),
    completion,
    close: async () => undefined,
  }));
  const view = render(
    <Theme>
      <SetupHub chat={{ send: vi.fn() }} scope={setupScope()} />
    </Theme>,
  );
  await waitFor(() => expect(loaders.capabilities).toHaveBeenCalledTimes(1));
  fail(new Error("model owner disconnected"));
  await view.findByText("Live setup updates paused: model owner disconnected");
  fireEvent.click(view.getByRole("button", { name: "Refresh setup overview" }));
  await waitFor(() => expect(loaders.observe).toHaveBeenCalledTimes(2));
  await waitFor(() =>
    expect(
      view.queryByText("Live setup updates paused: model owner disconnected"),
    ).toBeNull(),
  );
});
