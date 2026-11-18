import { describe, expect, it } from "vitest";
import type { PersonalWorkflowReport } from "../personal-workflows/types.js";
import { verifyPersonalWorld } from "./verify.js";
import { personalWorlds, type PersonalWorld } from "./worlds.js";

function reference(world: PersonalWorld): PersonalWorkflowReport {
  return {
    unresolved: [],
    results: world.expected.map((expected) => {
      if (expected.kind === "recallWorkspace") {
        const work = world.work.find(
          (item) => item.kind === "recallWorkspace",
        )!;
        const evidence = world.memory.flatMap((row, index) => {
          const id = `e${index + 1}`;
          return expected.cited.includes(id) &&
            (row.kind === "file" ||
              row.kind === "message" ||
              row.kind === "commit")
            ? [
                {
                  id,
                  kind: row.kind,
                  snippet: row.snippet,
                  where: row.where,
                  appendedAt: row.appendedAt,
                  path: row.path ?? null,
                  eventId: row.eventId ?? null,
                  logId: row.logId ?? null,
                  head: row.head ?? null,
                  contentHash: row.contentHash ?? null,
                },
              ]
            : [];
        });
        return {
          kind: expected.kind,
          report: {
            query: work.input.query,
            status: expected.status,
            claims: evidence.map((row) => ({
              statement: row.snippet,
              evidenceIds: [row.id],
            })),
            evidence,
            verify: expected.verify,
          },
        };
      }
      if (expected.kind === "routeSetup")
        return {
          kind: expected.kind,
          report: {
            action: expected.action,
            routeId: expected.routeId,
            workspaceScope: expected.scope,
            capabilityIds: [],
            unknownIds: expected.unknown,
            brief: "Here is the next setup step.",
          },
        };
      const work = world.work.find(
        (item) => item.kind === "planRepositoryWork",
      )!;
      return {
        kind: expected.kind,
        report: {
          repository: work.input.repository,
          operation: expected.operation,
          access: expected.access,
          decision: expected.decision,
          facts: [],
          next: ["Review the assigned workspace state."],
        },
      };
    }),
  };
}

describe("Personal task bank", () => {
  it("has stable IDs, source groups and explicit scenario dependencies", () => {
    expect(new Set(personalWorlds.map((world) => world.id)).size).toBe(
      personalWorlds.length,
    );
    const singles = new Set(
      personalWorlds
        .filter((world) => world.work.length === 1)
        .flatMap((world) => world.sources),
    );
    for (const world of personalWorlds) {
      expect(world.goal.trim()).not.toBe("");
      expect(world.sources.every((source) => singles.has(source))).toBe(true);
      expect(new Set(world.work.map((work) => work.kind))).toEqual(
        new Set(world.expected.map((row) => row.kind)),
      );
    }
    expect(
      personalWorlds.filter((world) => world.work.length > 1),
    ).toHaveLength(4);
  });

  it.each(personalWorlds)(
    "accepts the reference and rejects a missing result for $id",
    (world) => {
      const memory = world.work.find((work) => work.kind === "recallWorkspace");
      const requests = memory
        ? [{ query: memory.input.query, kinds: memory.input.kinds, limit: 8 }]
        : [];
      const report = reference(world);
      expect(verifyPersonalWorld(world, report, requests)).toEqual([]);
      expect(
        verifyPersonalWorld(
          world,
          { ...report, results: report.results.slice(1) },
          requests,
        ),
      ).not.toEqual([]);
      if (world.work.length > 1)
        expect(
          verifyPersonalWorld(
            world,
            { ...report, results: [...report.results].reverse() },
            requests,
          ),
        ).not.toEqual([]);
    },
  );
});

it("uses the assigned repo identity independently of the task name", () => {
  const original = personalWorlds.find(
    (world) => world.id === "dirty-before-update",
  )!;
  const renamed: PersonalWorld = {
    ...original,
    id: "alias",
    work: original.work.map((work) =>
      work.kind === "planRepositoryWork"
        ? {
            ...work,
            input: { ...work.input, repository: "projects/renamed-workspace" },
          }
        : work,
    ),
  };
  expect(verifyPersonalWorld(renamed, reference(renamed), [])).toEqual([]);
  expect(verifyPersonalWorld(renamed, reference(original), [])).toContain(
    "Repository plan differs from the assigned state or access",
  );
});
