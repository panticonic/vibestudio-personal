import { beforeEach, expect, it, vi } from "vitest";
import { prepareOpenBrowserMigration } from "./open-migration-managed.js";
const state = vi.hoisted(() => ({ nodes: new Map<string, Record<string, unknown>>(), notes: {} as Record<string,string>, revision: 0 }));
vi.mock("@workspace/runtime", () => {
  const handle = (id: string) => ({ id, stateArgs: {
    get: async () => ({ notes: structuredClone(state.notes) }),
    patch: async (patch: { notes?: Record<string,string> }) => { Object.assign(state.notes, patch.notes); state.revision++; },
  } });
  return { contextId: "owned", createPanelSlot: async (source: string, options: { parentId: string | null; contextId: string; title: string }) => {
    const id = `panel-${state.nodes.size}`;
    state.nodes.set(id, { slotId: id, parentSlotId: options.parentId, contextId: options.contextId, title: options.title, source });
    state.revision++; return handle(id);
  }, panelTree: { get: handle, path: async (id: string) => ({ revision: state.revision, entries: [{ node: structuredClone(state.nodes.get(id)) }] }),
    walk: async function* (root: string) { for (const [id,node] of state.nodes) if (id !== root) yield { node: structuredClone(node) }; },
  } };
});
vi.mock("./managed.js", () => ({ prepareManagedBrowserImport: async (_world: unknown, options: { sourceId: string }) => ({
  request: { kind: "recover", categories: ["bookmarks"], goal: "Retain the imported bookmark" }, services: {},
  readEvidence: async () => ({ id: "receipt", hostId: "host", bookmarks: [{ title: "Guide", url: "https://example.com/guide" }],
    receipt: { phase: "complete", hostId: "host", sourceId: options.sourceId, requestedDataTypes: ["bookmarks"], progress: [{ dataType: "bookmarks", stored: 1, skipped: 0, errors: 0 }] } }),
  readOutcome: async () => ({ preview: null, approvedPreview: null, receiptId: "receipt", phase: "complete", retainedBookmarks: [{ title: "Guide", url: "https://example.com/guide" }] }),
  verify: async (review: { next: string }) => ({ passed: review?.next === "keep-results" }),
}) }));
beforeEach(() => { state.nodes.clear(); state.notes = {}; state.revision = 0; });
async function fixture() {
  const bookmark = { title: "Guide", url: "https://example.com/guide" };
  const world = { kind: "browserMigration", id: "owned", goal: "Put the retained guide on the owned Desk note; preserve neighboring notes.",
    profiles: [{ profile: { id: "profile", label: "Owned", device: "host", categories: ["bookmarks"], approved: ["bookmarks"], retained: "complete" }, import: {} }],
    collection: { title: "Desk", panels: [{ title: "Target", parent: "Team", note: "old" }, { title: "Neighbor", parent: "Team", note: "protected" }] },
    expected: { source: "profile", status: "handed-off", handoff: { title: "Target", parent: "Team", bookmark } } };
  const prepared = await prepareOpenBrowserMigration(world as never), s = prepared.services.openBrowserMigration;
  const catalog = await s.discover(), choice = { sourceId: "profile", operation: "recover" as const, categories: ["bookmarks" as const] };
  await s.bind(catalog.revision, choice);
  const review = { next: "keep-results", source: null, totals: [], findings: [], progress: [{ category: "bookmarks", stored: 1, skipped: 0, errors: 0 }] } as const;
  return { prepared, s, catalog, choice, review, bookmark };
}
it("accepts unchanged earlier issued handoff evidence and harmless observation replays", async () => {
  const { prepared, s, catalog, choice, review, bookmark } = await fixture();
  expect(await s.bind(catalog.revision, choice)).not.toBeNull();
  await s.discover(); const evidence = await s.readOutcome(); await s.readOutcome();
  const first = (await s.inspectHandoff(review as never))!;
  const next = (await s.inspectHandoff(review as never))!;
  expect(next.revision).not.toBe(first.revision);
  const targetId = first.targets.find(row => row.title === "Target")!.id;
  const delivered = await s.stageHandoff(first.revision, { targetId, bookmark });
  expect(delivered).toMatchObject({ targetId, note: "Guide: https://example.com/guide" });
  await s.inspectHandoff(review as never);
  expect(await s.stageHandoff(first.revision, { targetId, bookmark })).toEqual(delivered);
  const result = { status: "handed-off", review, receiptId: evidence.receiptId,
    phase: evidence.phase, bookmarks: evidence.retainedBookmarks, delivery: delivered };
  expect((await prepared.verify(result as never)).passed).toBe(true);
  expect((await prepared.verify({ ...result, bookmarks: [] } as never)).passed).toBe(false);
});
it("retains native current-state CAS and refuses foreign targets or invented revisions", async () => {
  const { s, review, bookmark } = await fixture();
  const view = (await s.inspectHandoff(review as never))!, targetId = view.targets.find(row => row.title === "Target")!.id;
  expect(await s.stageHandoff("invented", { targetId, bookmark })).toBeNull();
  expect(await s.stageHandoff(view.revision, { targetId: "foreign", bookmark })).toBeNull();
  state.nodes.get(targetId)!.title = "Changed while reading";
  await expect(s.stageHandoff(view.revision, { targetId, bookmark })).rejects.toThrow("collection changed");
  expect(state.notes[targetId]).toBe("old");
});
