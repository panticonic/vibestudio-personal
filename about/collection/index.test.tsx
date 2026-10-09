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
  slotTitle: "Original",
  changed: null as null | (() => void),
  releaseWatch: vi.fn(async () => {}),
  args: {
    channelName: "collection-channel",
    agentKey: "agent",
  },
  launch: vi.fn(),
  initialize: vi.fn(),
  set: vi.fn(async () => undefined),
  setTitle: vi.fn(async (title: string) => {
    fixtures.slotTitle = title;
  }),
}));
vi.mock("@vibestudio/service-schemas/clients/eventsClient", () => ({
  EventsClient: class {
    on(_event: string, callback: () => void) { fixtures.changed = callback; return () => { fixtures.changed = null; }; }
    subscribe() { return Promise.resolve(); }
    unsubscribeAll = fixtures.releaseWatch;
  },
}));
vi.mock("@workspace/runtime", () => ({
  contextId: "context",
  rpc: {},
  panel: {
    slotId: "collection",
    stateArgs: { patch: fixtures.set },
    setTitle: fixtures.setTitle,
    onChildCreated: () => () => {},
  },
  panelTree: {
    page: async () => ({ revision: 1, entries: [] }),
    get: () => ({ stateArgs: { get: async () => fixtures.args } }),
    path: async () => ({
      revision: 1,
      entries: [{ node: { slotId: "collection", title: fixtures.slotTitle } }],
    }),
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
vi.mock("@workspace/pubsub", () => ({
  initializeConversation: fixtures.initialize,
}));
vi.mock("@workspace/agentic-chat/chat", () => ({
  AgenticChat: () => <input aria-label="Chat draft" />,
}));

beforeEach(() => {
  fixtures.slotTitle = "Original";
  fixtures.setTitle.mockClear();
  fixtures.launch.mockReset().mockResolvedValue(undefined);
  fixtures.initialize.mockReset().mockResolvedValue(undefined);
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
  expect(fixtures.initialize).toHaveBeenCalledWith(
    expect.objectContaining({
      channel: "collection-channel",
      contextId: "context",
    }),
  );
  expect(fixtures.launch).toHaveBeenCalledTimes(1);
  expect(fixtures.initialize.mock.invocationCallOrder[0]).toBeLessThan(
    fixtures.launch.mock.invocationCallOrder[0]!,
  );
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
  expect(fixtures.setTitle).toHaveBeenCalledWith("Renamed", { explicit: true });
  expect(fixtures.set).not.toHaveBeenCalledWith(
    expect.objectContaining({ title: expect.anything() }),
  );
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

it("refreshes another client's title change from tree invalidation and releases its watch", async () => {
  const view = render(<CollectionPanel />);
  await screen.findByText("Original");
  await act(async () => {
    fixtures.slotTitle = "Changed elsewhere";
    fixtures.changed!();
  });
  await screen.findByText("Changed elsewhere");
  fixtures.releaseWatch.mockClear();
  view.unmount();
  expect(fixtures.changed).toBeNull();
  expect(fixtures.releaseWatch).toHaveBeenCalledOnce();
});
