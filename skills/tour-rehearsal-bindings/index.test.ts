import type { PanelHandle } from "@workspace/runtime";
import { DECK, sceneEyebrow, sceneIndex } from "@workspace-panels/tour/deck";
import { expect, it, vi } from "vitest";
import { bindTourRehearsal } from "./index.js";

function fixture(restore = true) {
  let args = { scene: "continuum", notes: false };
  const patch = vi.fn(async (update: typeof args) => {
    args = { ...args, ...update };
    return args;
  });
  const close = vi.fn();
  const view = vi.fn(() => {
    const index = sceneIndex(args.scene);
    const item = DECK[index]!;
    return {
      eyebrow: sceneEyebrow(item.id),
      heading: item.title,
      progress: `${index + 1} / ${DECK.length}`,
      notesVisible: args.notes,
    };
  });
  const id = "owned-tour";
  const panel = {
    id,
    observe: async () => ({
      panelId: id, contextId: "assigned", source: "panels/tour",
      kind: "workspace", attemptId: "attempt", buildKey: "build",
    }),
    stateArgs: { get: async () => args, patch },
    cdp: { session: async () => (
      { close, page: {
        waitForFunction: async () => true,
        evaluate: view,
        locator: () => ({ click: async () => undefined }),
        keyboard: { press: async (key: string) => {
          if (key === "n") await patch({ ...args, notes: !args.notes });
          else await patch({ ...args, scene: DECK[Number(key) - 1]!.id });
        } },
      } }
    ) },
  } as unknown as PanelHandle;
  const { request, services } = bindTourRehearsal(panel, {
    contextId: "assigned",
    allowed: ["workspaces", "websites"],
    goal: "Rehearse capability and connection with notes",
    topics: ["Workspace capability boundaries", "Connected websites"],
    restore,
  });
  return { patch, close, id: request.operationId, tour: services.tourRehearsal };
}

it("checks allowed scene state, reads the rendered frame, and restores the opening view", async () => {
  const { tour, id, patch, close } = fixture();
  await expect(tour.observe("foreign")).rejects.toThrow("assigned");
  const start = await tour.observe(id);
  expect(start.frame.storedScene).toBe("continuum");
  await expect(tour.visit(id, "closing", false)).rejects.toThrow("authorized");
  expect(patch).not.toHaveBeenCalled();
  await expect(tour.visit(id, "workspaces", true)).resolves.toMatchObject({
    storedScene: "workspaces",
    progress: "3 / 6",
    notesVisible: true,
  });
  await expect(tour.restore(id)).resolves.toEqual(start.frame);
  await expect(tour.visit(id, "websites", true)).rejects.toThrow("authorized");
  expect(patch.mock.calls).toEqual([
    [{ scene: "workspaces", notes: false }],
    [{ scene: "workspaces", notes: true }],
    [{ scene: "continuum", notes: true }],
    [{ scene: "continuum", notes: false }],
  ]);
  expect(close).toHaveBeenCalledTimes(5);
});

it("holds a write if the presenter changed the panel after the initial read", async () => {
  const { tour, id, patch } = fixture(false);
  await tour.observe(id);
  await patch({ scene: "opening", notes: false });
  await expect(tour.visit(id, "websites", false)).rejects.toThrow("presenter changed");
  await expect(tour.restore(id)).rejects.toThrow("No restoration");
  expect(patch).toHaveBeenCalledTimes(1);
});
