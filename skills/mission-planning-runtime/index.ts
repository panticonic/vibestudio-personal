import type { Project, Task, TaskInput } from "@workspace/mission-control";
import type {
  MissionChanges,
  MissionSnapshot,
} from "../mission-planning/types.js";

export type MissionPlanningPort = {
  projects(): Promise<Project[]>;
  cards(
    projectId: string,
    options: { cursor?: string; limit: number },
  ): Promise<{
    tasks: Task[];
    cursor: string | null;
  }>;
  update(input: {
    id: string;
    expectedRevision: number;
    changes: Partial<TaskInput>;
  }): Promise<Task>;
};

const maxCards = 100;

export function bindMissionPlanning(
  port: MissionPlanningPort,
  assignedProjects: readonly string[],
) {
  const assigned = new Set(assignedProjects);
  let current: MissionSnapshot | undefined;
  const observations = new Map<string, MissionSnapshot>();
  let reading: Promise<MissionSnapshot> | undefined;
  let busy = false;

  async function read(): Promise<MissionSnapshot> {
    const projects = (await port.projects())
      .filter(({ id }) => assigned.has(id))
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(({ id, name, archived }) => ({ id, name, archived }));
    const cards: MissionSnapshot["cards"] = [];
    let complete = projects.length === assigned.size;
    for (const project of projects) {
      const notice = await port.cards(project.id, { limit: maxCards });
      if (
        notice.cursor !== null ||
        cards.length + notice.tasks.length > maxCards
      ) {
        complete = false;
        break;
      }
      for (const task of notice.tasks) {
        const {
          id,
          title,
          projectId,
          revision,
          dependencies,
          status,
          automationId,
          updatedAt,
        } = task;
        if (projectId !== project.id)
          throw new Error(
            "The Mission Control page crossed the assigned project",
          );
        cards.push({
          id,
          title,
          projectId,
          revision,
          dependencies,
          status,
          automationId,
          updatedAt,
        });
      }
    }
    return { id: crypto.randomUUID(), projects, cards, complete };
  }

  async function exclusive(operation: () => Promise<MissionSnapshot>) {
    if (busy) throw new Error("A planning operation is already in progress");
    busy = true;
    try {
      current = await operation();
      observations.set(current.id, current);
      return structuredClone(current);
    } finally {
      busy = false;
    }
  }

  function patchFor(
    change: MissionChanges,
    snapshot: MissionSnapshot,
  ): Partial<TaskInput> {
    const target = snapshot.cards.find((card) => card.id === change.cardId);
    if (
      !target ||
      target.revision !== change.revision ||
      !snapshot.projects.some(
        (project) => project.id === target.projectId && !project.archived,
      )
    ) {
      throw new Error(
        "The card revision or owning project changed during planning",
      );
    }
    if (change.kind === "relocate") {
      if (
        !snapshot.projects.some(
          ({ id, archived }) => id === change.projectId && !archived,
        ) ||
        change.projectId === target.projectId
      ) {
        throw new Error(
          "The destination must be a different assigned live project",
        );
      }
      return { projectId: change.projectId };
    }
    if (change.kind === "prerequisites") {
      const ids = new Set(snapshot.cards.map(({ id }) => id));
      if (change.dependencies.some((id) => !ids.has(id))) {
        throw new Error(
          "A prerequisite is outside the assigned planning board",
        );
      }
      return { dependencies: change.dependencies };
    }
    if (
      target.status !== "inbox" ||
      target.dependencies.some(
        (id) =>
          !snapshot.cards.some(
            (card) => card.id === id && card.status === "done",
          ),
      )
    ) {
      throw new Error(
        "The card can only move from Inbox when its prerequisites are done",
      );
    }
    return { status: "ready" };
  }

  return {
    missionPlanningState: { observe: () => {
      reading ??= exclusive(read).finally(() => { reading = undefined; });
      return reading.then(snapshot => structuredClone(snapshot));
    } },
    missionPlanningChange: {
      apply: (snapshotId: string, change: MissionChanges) =>
        exclusive(async () => {
          const basis = observations.get(snapshotId);
          if (!basis?.complete)
            throw new Error("The planning observation is unavailable");
          const fresh = await read();
          if (
            !fresh.complete ||
            JSON.stringify(fresh.cards) !== JSON.stringify(basis.cards) ||
            JSON.stringify(fresh.projects) !== JSON.stringify(basis.projects)
          ) {
            throw new Error("The planning board changed since it was observed");
          }
          const changes = patchFor(change, fresh);
          await port.update({
            id: change.cardId,
            expectedRevision: change.revision,
            changes,
          });
          return await read();
        }),
    },
  };
}
