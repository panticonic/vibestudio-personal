import { rpc } from "@workspace/runtime/worker/kernel";
import { MissionControlStore } from "@workspace-workers/mission-control-store";

export class MissionPlanningFixtureStore extends MissionControlStore {
  @rpc({
    website: { kind: "closed", reason: "Test-owned planning records." },
    principals: ["code"],
    effect: { kind: "open" },
    tier: "open",
    sensitivity: "read",
  })
  override overview(input?: { cursor?: string; limit?: number }) {
    return super.overview(input);
  }

  @rpc({
    website: { kind: "closed", reason: "Test-owned planning records." },
    principals: ["code"],
    effect: { kind: "open" },
    tier: "open",
    sensitivity: "read",
  })
  override getTask(input: { id: string }) {
    return super.getTask(input);
  }

  @rpc({
    website: { kind: "closed", reason: "Test-owned planning records." },
    principals: ["code"],
    effect: { kind: "open" },
    tier: "open",
    sensitivity: "read",
  })
  override taskOptions(input?: {
    projectId?: string;
    query?: string;
    cursor?: string;
    limit?: number;
  }) {
    return super.taskOptions(input);
  }

  @rpc({
    website: { kind: "closed", reason: "Test-owned planning records." },
    principals: ["code"],
    effect: { kind: "open" },
    tier: "open",
    sensitivity: "write",
  })
  override createProject(input: unknown) {
    return super.createProject(input);
  }

  @rpc({
    website: { kind: "closed", reason: "Test-owned planning records." },
    principals: ["code"],
    effect: { kind: "open" },
    tier: "open",
    sensitivity: "write",
  })
  override updateProject(input: unknown) {
    return super.updateProject(input);
  }

  @rpc({
    website: { kind: "closed", reason: "Test-owned planning records." },
    principals: ["code"],
    effect: { kind: "open" },
    tier: "open",
    sensitivity: "write",
  })
  override createTask(input: unknown) {
    return super.createTask(input);
  }

  @rpc({
    website: { kind: "closed", reason: "Test-owned planning records." },
    principals: ["code"],
    effect: { kind: "open" },
    tier: "open",
    sensitivity: "write",
  })
  override updateTask(input: unknown) {
    return super.updateTask(input);
  }
}
