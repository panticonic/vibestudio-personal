// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPanelDeepLink,
  parsePanelLocationLink,
} from "@vibestudio/shared/panelLocation";
import { parseShellSurfaceLink } from "@vibestudio/shared/shellSurface";
import { Automations, Continuum, Websites } from "./ProductTour";
import {
  APP_DEMO_PROMPT,
  AUTOMATION_DEMO_PROMPT,
  WRITING_WORKSPACE_URL,
} from "../lib/demos";

vi.mock("@workspace/runtime", () => ({
  buildPanelLink: (source: string, options: object) =>
    createPanelDeepLink({ source, ...options }),
  panel: { openCommandAgent: vi.fn() },
}));
vi.mock("@workspace/agentic-chat/presentation", () => ({
  MessageSurface: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  InlineUiSurface: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  MessageContent: ({ content }: { content: string }) => <span>{content}</span>,
}));

describe("tour live actions", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });
  function link(label: string) {
    const anchor = [...container.querySelectorAll("a")].find(
      (a) => a.textContent === label,
    );
    expect(anchor, label).toBeDefined();
    return anchor!.getAttribute("href")!;
  }

  it.each([
    [Continuum, "Watch an agent change an app", APP_DEMO_PROMPT],
    [Automations, "Run a project pulse", AUTOMATION_DEMO_PROMPT],
  ] as const)(
    "opens an ordinary child chat with the selected request (%s)",
    async (Scene, label, prompt) => {
      await act(async () => root.render(<Scene />));
      const parsed = parsePanelLocationLink(link(label));
      expect(parsed.kind).toBe("ok");
      if (parsed.kind !== "ok") throw new Error(parsed.reason);
      expect(parsed.location).toEqual({
        source: "panels/chat",
        disposition: "child",
        placement: { disposition: "side-if-room" },
        title: expect.any(String),
        stateArgs: { initialPrompt: prompt },
      });
      // No inherited tour context or pinned main ref: chat gets its own branch.
      expect(parsed.location.contextId).toBeUndefined();
      expect(parsed.location.ref).toBeUndefined();
    },
  );

  it("offers template source review only in the installed-app view", async () => {
    await act(async () => root.render(<Websites />));
    expect(container.querySelector("a")).toBeNull();
    const install = [...container.querySelectorAll("button")].find(
      (b) => b.textContent === "Install an app workspace",
    )!;
    await act(async () => install.click());
    expect(
      parseShellSurfaceLink(link("Try a writing workspace")),
    ).toMatchObject({
      kind: "ok",
      target: { kind: "workspace-chooser", sourceUrl: WRITING_WORKSPACE_URL },
    });
  });

  it("keeps the shared continuum state while offering the live source-editing action", async () => {
    await act(async () => root.render(<Continuum />));
    await act(async () =>
      container
        .querySelector<HTMLInputElement>('input[type="checkbox"]')!
        .click(),
    );
    const inline = [...container.querySelectorAll("button")].find(
      (b) => b.textContent === "UI in chat",
    )!;
    await act(async () => inline.click());
    expect(
      container.querySelector<HTMLInputElement>('input[type="checkbox"]')!
        .checked,
    ).toBe(true);
    expect(link("Watch an agent change an app")).toBeTruthy();
  });

  it("keeps the automation dashboard as a separate System-workspace link", async () => {
    await act(async () => root.render(<Automations />));
    expect(parsePanelLocationLink(link("Explore automations ↗"))).toMatchObject(
      {
        kind: "ok",
        location: {
          source: "about/automations",
          workspace: { role: "system" },
        },
      },
    );
  });
});
