import { describe, expect, it } from "vitest";
import { verifyPersonalFacilityWorld } from "./verify.js";
import { personalFacilityWorlds } from "./worlds.js";

describe("Personal facility review verification", () => {
  for (const world of personalFacilityWorlds) {
    it(world.id, () => {
      expect(verifyPersonalFacilityWorld(world, world.expected)).toBe(true);
      const badStatus = world.expected.status === "ready" ? "blocked" : "ready";
      expect(
        verifyPersonalFacilityWorld(world, {
          ...world.expected,
          status: badStatus,
        }),
      ).toBe(false);
      expect(
        verifyPersonalFacilityWorld(world, { ...world.expected, findings: [] }),
      ).toBe(false);
      for (const finding of world.expected.findings) {
        expect(
          verifyPersonalFacilityWorld(world, {
            ...world.expected,
            findings: [{ ...finding, evidenceIds: ["other-context"] }],
          }),
        ).toBe(false);
      }

      const alias = <T>(value: T): T => {
        let json = JSON.stringify(value);
        for (const id of world.expected.findings.flatMap(
          (finding) => finding.evidenceIds,
        )) {
          json = json.replaceAll(
            JSON.stringify(id),
            JSON.stringify(`anonymous-${id}`),
          );
        }
        return JSON.parse(json);
      };
      const aliased = alias(world);
      expect(verifyPersonalFacilityWorld(aliased, aliased.expected)).toBe(true);
      expect(verifyPersonalFacilityWorld(aliased, world.expected)).toBe(false);
    });
  }

  it("retains distinct tasks across all five facilities", () => {
    expect(new Set(personalFacilityWorlds.map((world) => world.id)).size).toBe(
      personalFacilityWorlds.length,
    );
    expect(
      new Set(personalFacilityWorlds.map((world) => world.request.kind)),
    ).toEqual(
      new Set(["browser", "collection", "tour", "mission", "explorer"]),
    );
    expect(
      new Set(
        personalFacilityWorlds.map((world) => world.expected.findings[0].code),
      ).size,
    ).toBe(personalFacilityWorlds.length);
  });
});
