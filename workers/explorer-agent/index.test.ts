import { afterEach, describe, expect, it } from "vitest";
import { createNativeVesselTestDO } from "@workspace/agentic-do/testing/native-vessel";
import type { ParticipantDescriptor } from "@workspace/harness";
import type {
  ToolRegistration,
  ToolExecutionApi,
} from "@panticonic/pi-durable";
import type { AgentToolExecutionContext } from "@workspace/agentic-do";
import { executeTool } from "@workspace/harness/testing/native-tool";
import type { RpcClient } from "@vibestudio/rpc";
import { ExplorerAgentWorker } from "./index.js";
class TestExplorerAgentWorker extends ExplorerAgentWorker {
  participant(): ParticipantDescriptor {
    return this.getParticipantInfo("ch-1");
  }
  prompt(): string | undefined {
    return this.getAgentPrompt("ch-1");
  }
  policy(): string {
    return this.getPublishPolicy("ch-1");
  }
  async tools(): Promise<ToolRegistration[]> {
    return this.getTools("ch-1");
  }
  respondPolicy(): string {
    return this.getDefaultRespondPolicy();
  }
  private toolRpc?: RpcClient;
  protected override async bindNativeToolExecution(
    api: ToolExecutionApi,
  ): Promise<AgentToolExecutionContext> {
    if (!this.toolRpc) throw new Error("Missing effect unit-test RPC fixture");
    return {
      invocationId: api.callId,
      commandId: `command:${api.callId}`,
      rpc: this.toolRpc,
    };
  }
  async reportTool(rpc: RpcClient): Promise<ToolRegistration> {
    this.toolRpc = rpc;
    const tool = (await this.getTools("ch-1")).find(
      (tool) => tool.name === "report_finding",
    );
    if (!tool) throw new Error("report_finding missing");
    return tool;
  }
  prepareChannel(): void {
    this.sql.exec(`INSERT INTO subscriptions
         (channel_id, context_id, revision, subscribed_at, config, relationship_json, participant_id)
       VALUES ('ch-1', 'ctx-1', 1, 1, NULL, '{}', 'agent:explorer')`);
  }
  findingCount(): number {
    return Number(
      this.sql.exec(`SELECT COUNT(*) AS count FROM explorer_findings`).one()[
        "count"
      ],
    );
  }
  findingOpPhase(): string | null {
    return (
      (this.sql.exec(`SELECT phase FROM explorer_finding_ops`).toArray()[0]?.[
        "phase"
      ] as string | undefined) ?? null
    );
  }
}
const resources: Array<
  Awaited<ReturnType<typeof createNativeVesselTestDO<TestExplorerAgentWorker>>>
> = [];
async function createExplorer() {
  const resource = await createNativeVesselTestDO(TestExplorerAgentWorker);
  resources.push(resource);
  return resource;
}
afterEach(async () => {
  for (const resource of resources.splice(0)) {
    try {
      const released = await resource.instance.releaseForLifecycle({
        epoch: "test-end",
        mode: "suspend",
        reason: "test",
        deadlineMs: 0,
      });
      expect(released.status).toBe("ready");
    } finally {
      resource.db.close();
    }
  }
});
describe("ExplorerAgentWorker", () => {
  it("is a silent agent with explorer identity + oracle-loop prompt", async () => {
    const { instance } = await createExplorer();
    const worker = instance as TestExplorerAgentWorker;
    const participant = worker.participant();
    expect(participant.handle).toBe("explorer");
    expect(participant.name).toBe("Explorer");
    const prompt = worker.prompt();
    expect(prompt).toMatch(/explorer/i);
    expect(prompt).toMatch(/expectation/i); // the oracle loop is load-bearing
    // Visible when it responds — silence is via the respond policy, not output suppression.
    expect(worker.policy()).toBe("all");
    // Does NOT respond to every message — else it would run a concurrent turn on each
    // channel message alongside other agents, diverging the shared per-channel log.
    expect(worker.respondPolicy()).toBe("mentioned-or-followup");
  });
  it("exposes report_finding alongside the inherited notify tool", async () => {
    const { instance } = await createExplorer();
    const worker = instance as TestExplorerAgentWorker;
    worker.prepareChannel();
    const names = (await worker.tools()).map((tool) => tool.name);
    expect(names).toContain("report_finding");
    expect(names).toContain("notify");
  });
  it("resumes publication without exposing a partially published finding", async () => {
    const { instance } = await createExplorer();
    const worker = instance as TestExplorerAgentWorker;
    worker.prepareChannel();
    let pushAttempts = 0;
    const calls: string[] = [];
    const rpc = {
      call: async <T>(_target: string, method: string): Promise<T> => {
        calls.push(method);
        if (method === "vcs.status") {
          const statusCalls = calls.filter(
            (value) => value === "vcs.status",
          ).length;
          return (
            statusCalls === 1
              ? {
                  clean: true,
                  workingHead: { kind: "event", eventId: "base" },
                  mainEventId: "main-0",
                }
              : {
                  clean: false,
                  workingHead: { kind: "application", applicationId: "app-1" },
                  mainEventId: "main-0",
                }
          ) as T;
        }
        if (method === "vcs.commit") {
          return { event: { kind: "event", eventId: "commit-1" } } as T;
        }
        if (method === "vcs.push") {
          pushAttempts += 1;
          if (pushAttempts === 1) throw new Error("publication unavailable");
          return { eventId: "commit-1", mainEventId: "main-1" } as T;
        }
        return undefined as T;
      },
      stream: async () => new Response(),
    } as unknown as RpcClient;
    const tool = await worker.reportTool(rpc);
    const params = {
      runId: "run-1",
      class: "BUG",
      surface: "service:test",
      title: "broken",
      expected: "works",
      actual: "fails",
    };
    await expect(
      executeTool(tool, params, { callId: "tool-1" }),
    ).rejects.toThrow("publication unavailable");
    expect(worker.findingCount()).toBe(0);
    expect(worker.findingOpPhase()).toBe("committed");
    await expect(
      executeTool(
        tool,
        { ...params, title: "different finding" },
        { callId: "tool-1" },
      ),
    ).rejects.toThrow("reused with different input");
    expect(worker.findingCount()).toBe(0);
    expect(worker.findingOpPhase()).toBe("committed");
    expect(pushAttempts).toBe(1);
    await expect(
      executeTool(tool, params, { callId: "tool-1" }),
    ).resolves.toMatchObject({
      details: { id: "tool-1", eventId: "commit-1", mainEventId: "main-1" },
    });
    expect(worker.findingCount()).toBe(1);
    expect(worker.findingOpPhase()).toBe("finalized");
    expect(calls.filter((method) => method === "fs.writeFile")).toHaveLength(1);
    expect(calls.filter((method) => method === "vcs.commit")).toHaveLength(1);
    expect(calls.filter((method) => method === "vcs.push")).toHaveLength(2);
  });
  it("integrates a concurrently advanced main before retrying publication", async () => {
    const { instance } = await createExplorer();
    const worker = instance as TestExplorerAgentWorker;
    worker.prepareChannel();
    let statusCalls = 0;
    let compareCalls = 0;
    let commitCalls = 0;
    let pushCalls = 0;
    const pushInputs: Array<Record<string, unknown>> = [];
    const rpc = {
      call: async <T>(
        _target: string,
        method: string,
        args: unknown[],
      ): Promise<T> => {
        if (method === "vcs.status") {
          statusCalls += 1;
          if (statusCalls === 1) {
            return {
              clean: true,
              committed: { kind: "event", eventId: "base" },
              workingHead: { kind: "event", eventId: "base" },
              mainEventId: "main-0",
            } as T;
          }
          if (statusCalls === 2) {
            return {
              clean: false,
              committed: { kind: "event", eventId: "base" },
              workingHead: {
                kind: "application",
                applicationId: "app-finding",
              },
              mainEventId: "main-0",
            } as T;
          }
          return {
            clean: true,
            committed: { kind: "event", eventId: "commit-1" },
            workingHead: { kind: "event", eventId: "commit-1" },
            mainEventId: "main-1",
          } as T;
        }
        if (method === "vcs.commit") {
          commitCalls += 1;
          return {
            event: {
              kind: "event",
              eventId: commitCalls === 1 ? "commit-1" : "commit-2",
            },
          } as T;
        }
        if (method === "vcs.push") {
          pushCalls += 1;
          pushInputs.push(args[0] as Record<string, unknown>);
          if (pushCalls === 1) {
            throw Object.assign(new Error("protected main advanced"), {
              errorData: {
                code: "RevisionChanged",
                expected: { kind: "event", eventId: "main-0" },
                actual: { kind: "event", eventId: "main-1" },
              },
            });
          }
          return { eventId: "commit-2", mainEventId: "main-2" } as T;
        }
        if (method === "vcs.compare") {
          compareCalls += 1;
          return {
            target: { kind: "event", eventId: "commit-1" },
            source: { kind: "event", eventId: "main-1" },
            base: { kind: "event", eventId: "base" },
            coordinates: [],
            counts: {
              adopt: 1,
              convergent: 0,
              composed: 0,
              conflict: 0,
              resolved: 0,
            },
            intentCounts: {
              merged: 0,
              settled: 0,
              split: 0,
              contested: 0,
              pending: 1,
            },
            resolution: {
              complete: false,
              remainingCoordinateCount: 1,
              concluded: false,
            },
            intents: [],
            intentsTruncated: false,
            nextCursor: null,
          } as T;
        }
        if (method === "vcs.merge") {
          return {
            status: "working",
            commandId: "command:merge",
            contextId: "run-1",
            workUnitId: "work:merge",
            applicationId: "app-merged",
            changeCount: 0,
            changeIds: [],
            incorporatedChangeCount: 1,
            incorporatedChangeIds: ["change:main-1"],
            decisionIds: ["decision:merge"],
            workingHead: { kind: "application", applicationId: "app-merged" },
            decisionId: "decision:merge",
            outcomes: [],
            resolution: {
              complete: true,
              remainingCoordinateCount: 0,
              concluded: true,
            },
            counts: {
              adopt: 0,
              convergent: 0,
              composed: 0,
              conflict: 0,
              resolved: 1,
            },
            intents: [],
            intentsTruncated: false,
            composed: [],
            conflicts: [],
            nextConflictCursor: null,
          } as T;
        }
        return undefined as T;
      },
      stream: async () => new Response(),
    } as unknown as RpcClient;
    await expect(
      executeTool(
        await worker.reportTool(rpc),
        {
          runId: "run-1",
          class: "BUG",
          surface: "service:test",
          title: "broken",
          expected: "works",
          actual: "fails",
        },
        { callId: "tool-1" },
      ),
    ).resolves.toMatchObject({
      details: { eventId: "commit-2", mainEventId: "main-2" },
    });
    expect(pushInputs).toEqual([
      expect.objectContaining({
        expectedCommittedEventId: "commit-1",
        expectedMainEventId: "main-0",
      }),
      expect.objectContaining({
        expectedCommittedEventId: "commit-2",
        expectedMainEventId: "main-1",
      }),
    ]);
    expect(commitCalls).toBe(2);
    expect(worker.findingOpPhase()).toBe("finalized");
  });
});
