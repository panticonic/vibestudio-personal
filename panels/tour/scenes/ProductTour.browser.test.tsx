import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from "@workspace/test-runtime";
import { parsePanelLocationLink } from "@vibestudio/shared/panelLocation";
import { parseShellSurfaceLink } from "@vibestudio/shared/shellSurface";
import { Automations, Continuum, Websites } from "./ProductTour";
import {
  APP_DEMO_PROMPT,
  AUTOMATION_DEMO_PROMPT,
  WRITING_WORKSPACE_URL,
} from "../lib/demos";

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
      (candidate) => candidate.textContent === label,
    );
    expect(anchor).toBeDefined();
    return anchor!.getAttribute("href")!;
  }

  for (const [Scene, label, prompt] of [
    [Continuum, "Watch an agent change an app", APP_DEMO_PROMPT],
    [Automations, "Run a project pulse", AUTOMATION_DEMO_PROMPT],
  ] as const) {
    it(`opens an ordinary child chat with the selected request (${label})`, async () => {
      await act(async () => root.render(<Scene />));
      const parsed = parsePanelLocationLink(link(label));
      expect(parsed.kind).toBe("ok");
      if (parsed.kind !== "ok") throw new Error(parsed.reason);
      expect(parsed.location.source).toBe("panels/chat");
      expect(parsed.location.disposition).toBe("child");
      expect(parsed.location.placement).toEqual({
        disposition: "side-if-room",
      });
      expect(parsed.location.stateArgs).toEqual({
        seed: { openingRequest: prompt },
      });
      expect(parsed.location.contextId).toBeUndefined();
      expect(parsed.location.ref).toBeUndefined();
    });
  }

  it("offers template source review only in the installed-app view", async () => {
    await act(async () => root.render(<Websites />));
    expect(container.querySelector("a")).toBeNull();
    const install = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Install an app workspace",
    );
    expect(install).toBeDefined();
    await act(async () => install!.click());
    const parsed = parseShellSurfaceLink(link("Try a writing workspace"));
    expect(parsed.kind).toBe("ok");
    if (parsed.kind !== "ok") {
      throw new Error(`Expected a shell-surface link, received ${parsed.kind}`);
    }
    expect(parsed.target).toEqual({
      kind: "workspace-chooser",
      sourceUrl: WRITING_WORKSPACE_URL,
    });
  });

  it("uses the themed slider with fixed continuum stages", async () => {
    await act(async () => root.render(<Continuum />));
    const slider = container.querySelector<HTMLElement>('[role="slider"]')!;
    expect(slider).toBeDefined();
    expect(slider.getAttribute("aria-valuemin")).toBe("0");
    expect(slider.getAttribute("aria-valuemax")).toBe("2");
    expect(slider.getAttribute("aria-valuenow")).toBe("0");
    expect(container.querySelectorAll(".continuum-stops button")).toHaveLength(3);
  });

  it("keeps the shared continuum state while offering the live source-editing action", async () => {
    await act(async () => root.render(<Continuum />));
    await act(async () =>
      container
        .querySelector<HTMLInputElement>('input[type="checkbox"]')!
        .click(),
    );
    const inline = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "UI in chat",
    );
    expect(inline).toBeDefined();
    await act(async () => inline!.click());
    expect(
      container.querySelector<HTMLInputElement>('input[type="checkbox"]')!
        .checked,
    ).toBe(true);
    expect(link("Watch an agent change an app")).toBeTruthy();
  });

  it("keeps the automation dashboard as a separate System-workspace link", async () => {
    await act(async () => root.render(<Automations />));
    const parsed = parsePanelLocationLink(link("Explore automations ↗"));
    expect(parsed.kind).toBe("ok");
    if (parsed.kind !== "ok") throw new Error(parsed.reason);
    expect(parsed.location.source).toBe("about/automations");
    expect(parsed.location.workspace).toEqual({ role: "system" });
  });
});
