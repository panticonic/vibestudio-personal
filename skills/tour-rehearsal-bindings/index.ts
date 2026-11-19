import type { PanelHandle } from "@workspace/runtime";
import { DECK, sceneEyebrow, sceneIndex } from "@workspace-panels/tour/deck";
import type {
  TourFrame,
  TourRehearsalRequest,
  TourStart,
} from "../tour-rehearsal/types.js";

type AssignedPanel = Pick<PanelHandle, "cdp" | "observe" | "stateArgs" | "id">;
type Args = { scene?: string; notes?: boolean };
type Assignment = Omit<TourRehearsalRequest, "operationId"> & {
  contextId: string;
  allowed: string[];
};
const sceneIds: readonly string[] = DECK.map(({ id }) => id);
const deck = DECK.map(({ id, title }, index) => ({
  id,
  title,
  position: index + 1,
  eyebrow: sceneEyebrow(id),
}));

function state(args: Args) {
  return { scene: DECK[sceneIndex(args.scene)]!.id, notes: args.notes === true };
}

export function bindTourRehearsal(panel: AssignedPanel, assigned: Assignment) {
  const { contextId, allowed, topics, goal, restore } = structuredClone(assigned);
  if (
    !contextId || !goal.trim() || topics.length < 1 ||
    topics.length > deck.length || topics.some((topic) => !topic.trim()) ||
    allowed.some((id) => !deck.some((scene) => scene.id === id))
  ) throw new Error("Assign a valid tour panel, rehearsal topics and allowed scenes");
  const request: TourRehearsalRequest = { operationId: crypto.randomUUID(), goal, topics, restore };
  let opening: TourStart | undefined;
  let previous: TourFrame | undefined;
  let visits = 0;
  let restored = false;
  let active = false;

  async function exclusive<T>(id: string, operation: () => Promise<T>): Promise<T> {
    if (id !== request.operationId) throw new Error("Use the caller's assigned tour operation");
    if (active) throw new Error("Wait for the current tour stop to settle");
    active = true;
    try {
      return await operation();
    } finally {
      active = false;
    }
  }

  async function requireAssignedPanel() {
    const panelState = await panel.observe();
    if (panelState.panelId !== panel.id || panelState.contextId !== contextId ||
      panelState.source !== "panels/tour" || panelState.kind !== "workspace")
      throw new Error("The renderer is outside the assigned tour panel");
    return panelState;
  }

  async function frame(): Promise<TourFrame> {
    const before = await requireAssignedPanel();
    const saved = state(await panel.stateArgs.get<Args>());
    const expected = deck[sceneIndex(saved.scene)]!;
    const session = await panel.cdp.session();
    try {
      const view = { eyebrow: expected.eyebrow, notes: saved.notes };
      await session.page.waitForFunction((arg: unknown) => {
        const { eyebrow, notes } = arg as { eyebrow: string; notes: boolean };
        return document.querySelector(".tour-stage .scene__eyebrow")?.textContent?.trim() === eyebrow &&
          Boolean(document.querySelector('aside[aria-label="Presenter notes"]')) === notes;
      }, view);
      const visible = await session.page.evaluate<Omit<TourFrame, "storedScene" | "storedNotes">>(`({
        eyebrow: document.querySelector(".tour-stage .scene__eyebrow")?.textContent?.trim() ?? "",
        heading: document.querySelector(".tour-stage h1")?.textContent?.trim() ?? "",
        progress: document.querySelector(".tour-footer [aria-live]")?.textContent?.trim() ?? "",
        notesVisible: Boolean(document.querySelector('aside[aria-label="Presenter notes"]'))
      })`);
      const current = state(await panel.stateArgs.get<Args>());
      const after = await requireAssignedPanel();
      if (before.attemptId !== after.attemptId || before.buildKey !== after.buildKey ||
        current.scene !== saved.scene || current.notes !== saved.notes)
        throw new Error("The tour changed during readback");
      return { storedScene: current.scene, storedNotes: current.notes, ...visible };
    } finally {
      await session.close();
    }
  }

  async function apply(scene: string, notes: boolean) {
    if (!previous) throw new Error("Read the assigned tour before moving it");
    await requireAssignedPanel();
    const current = state(await panel.stateArgs.get<Args>());
    if (previous.storedScene !== current.scene || previous.storedNotes !== current.notes)
      throw new Error("The presenter changed the tour; start a fresh rehearsal");
    const destination = deck[sceneIndex(scene)]!;
    const session = await panel.cdp.session();
    try {
      const { page } = session;
      await page.locator(".tour-stage h1").click();
      const committed = (expectedScene: string, expectedNotes: boolean) =>
        page.waitForFunction((arg: unknown) => {
          const expected = arg as { scene: string; notes: boolean; sceneIds: readonly string[] };
          const args = (window as Window & {
            __vibestudioStateArgs?: { scene?: string; notes?: boolean };
          }).__vibestudioStateArgs;
          const current = args?.scene;
          const visibleScene = current && expected.sceneIds.includes(current)
            ? current : expected.sceneIds[0];
          return visibleScene === expected.scene && (args?.notes === true) === expected.notes;
        }, { scene: expectedScene, notes: expectedNotes, sceneIds });
      if (current.scene !== destination.id) {
        await page.keyboard.press(String(destination.position));
        await committed(destination.id, current.notes);
      }
      if (current.notes !== notes) {
        await page.keyboard.press("n");
        await committed(destination.id, notes);
      }
    } finally {
      await session.close();
    }
    previous = await frame();
    return structuredClone(previous);
  }

  return {
    request,
    services: {
      tourRehearsal: {
        observe: (id: string) => exclusive(id, async () => {
          if (!opening) {
            previous = await frame();
            opening = { deck, allowed, frame: previous };
          }
          return structuredClone(opening);
        }),
        visit: (id: string, scene: string, notes: boolean) => exclusive(id, async () => {
          if (restored || visits === topics.length || !allowed.includes(scene) ||
            typeof notes !== "boolean")
            throw new Error("Visit only the authorized rehearsal stops");
          visits++;
          return apply(scene, notes);
        }),
        restore: (id: string) => exclusive(id, async () => {
          if (!restore || !opening || !visits || restored)
            throw new Error("No restoration is authorized for this rehearsal");
          restored = true;
          return apply(opening.frame.storedScene, opening.frame.storedNotes);
        }),
      },
    },
  };
}
