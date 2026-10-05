// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import CollectionPanel from "./index";

const fixtures = vi.hoisted(() => ({
  args: {
    title: "Original",
    channelName: "collection-channel",
    agentKey: "agent",
  },
  launch: vi.fn(),
  set: vi.fn(async () => undefined),
  setTitle: vi.fn(async () => undefined),
}));
vi.mock("@workspace/runtime", () => ({
  contextId: "context",
  rpc: {},
  panel: {
    slotId: "collection",
    stateArgs: { set: fixtures.set },
    setTitle: fixtures.setTitle,
    onChildCreated: () => () => {},
  },
  panelTree: {
    page: async () => ({ revision: 1, entries: [] }),
    get: () => ({ stateArgs: { get: async () => fixtures.args } }),
  },
}));
vi.mock("@workspace/runtime/internal/diagnostics", () => ({
  recoveryCoordinator: {},
}));
vi.mock("@workspace/react", () => ({
  usePanelTheme: () => "light",
  usePanelThemeConfig: () => ({}),
  useStateArgs: () => fixtures.args,
}));
vi.mock("@workspace/agentic-core", () => ({
  launchAgentIntoChannel: fixtures.launch,
  createPanelImportLoader: () => undefined,
}));
vi.mock("@workspace/agentic-chat/chat", () => ({
  AgenticChat: () => <input aria-label="Chat draft" />,
}));

beforeEach(() => {
  fixtures.args.title = "Original";
  fixtures.launch.mockReset().mockResolvedValue(undefined);
  fixtures.set.mockClear();
  fixtures.set.mockImplementation(async (patch?: object) => {
    Object.assign(fixtures.args, patch);
  });
});
afterEach(cleanup);

it("preserves the chat input and draft through reconfiguration, failure, and retry", async () => {
  render(<CollectionPanel />);
  const input = await screen.findByRole("textbox", { name: "Chat draft" });
  fireEvent.change(input, { target: { value: "Unsent draft" } });
  await waitFor(() => expect(screen.getByText("ready")).toBeTruthy());
  let reject!: (cause: Error) => void;
  fixtures.launch.mockReturnValueOnce(
    new Promise((_, no) => {
      reject = no;
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Rename collection" }));
  const title = screen.getByDisplayValue("Original");
  fireEvent.change(title, { target: { value: "Renamed" } });
  fireEvent.keyDown(title, { key: "Enter" });
  await waitFor(() => expect(fixtures.launch).toHaveBeenCalledTimes(2));
  expect(screen.getByRole("textbox", { name: "Chat draft" })).toBe(input);
  expect(input).toHaveProperty("value", "Unsent draft");
  await act(async () => reject(new Error("Agent unavailable")));
  expect(screen.getByText("Agent unavailable")).toBeTruthy();
  expect(screen.getByRole("textbox", { name: "Chat draft" })).toBe(input);
  fixtures.launch.mockResolvedValueOnce(undefined);
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await waitFor(() => expect(screen.getByText("ready")).toBeTruthy());
  expect(screen.getByRole("textbox", { name: "Chat draft" })).toBe(input);
  expect(input).toHaveProperty("value", "Unsent draft");
});
