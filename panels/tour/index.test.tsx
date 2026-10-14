// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DECK } from "./deck";
import TourPanelRoot from "./index";

const runtime = vi.hoisted(() => ({
  args: {} as { scene?: string; notes?: boolean },
  patch: vi.fn(),
}));

vi.mock("@radix-ui/themes", () => ({
  Theme: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@workspace/runtime", () => ({
  panel: { stateArgs: { patch: runtime.patch } },
}));
vi.mock("@workspace/react", () => ({
  useAgentState: vi.fn(),
  useHostCommands: vi.fn(),
  useIsMobile: () => false,
  usePanelTheme: () => "light",
  usePanelThemeConfig: () => ({}),
  useStateArgs: () => runtime.args,
}));
vi.mock("@workspace/ui/brand", () => ({
  VibestudioLogo: () => null,
}));
vi.mock("./scenes/ProductTour", () => ({
  SCENE_COMPONENTS: Object.fromEntries(
    DECK.map((scene) => [scene.id, () => <div>{scene.title}</div>]),
  ),
}));

beforeEach(() => {
  runtime.args = {};
  runtime.patch.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    configurable: true,
    value: vi.fn(),
  });
});

describe("tour keyboard ownership", () => {
  it("keeps one listener aligned with the committed scene and overlay state", async () => {
    const addEventListener = vi.spyOn(window, "addEventListener");
    render(<TourPanelRoot />);

    expect(
      addEventListener.mock.calls.filter(([event]) => event === "keydown"),
    ).toHaveLength(1);
    addEventListener.mockRestore();

    fireEvent.keyDown(window, { key: "?" });
    expect(
      screen.getByRole("dialog", { name: "Keyboard shortcuts" }),
    ).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.keyDown(window, { key: "ArrowRight" });
    await waitFor(() =>
      expect(runtime.patch).toHaveBeenCalledWith({ scene: DECK[1]!.id }),
    );
    expect(
      screen
        .getByRole("button", { name: /02\s*Apps meet agents/ })
        .getAttribute("aria-current"),
    ).toBe("true");
  });
});
