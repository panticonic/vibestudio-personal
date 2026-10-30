import { describe, expect, it } from "vitest";
import steps from "./troubleshootGithub/steps.js";

describe("steps", () => {
  it("returns the documented steps for each cause", () => {
    expect(steps("bad-credentials").steps[0]).toContain("GitHubSetup.tsx");
    expect(steps("org-approval").steps[0]).toContain("organization");
    expect(steps("publish-preflight").accessLevel).toBe("publish");
    expect(steps("unknown").steps).toHaveLength(1);
  });
});
