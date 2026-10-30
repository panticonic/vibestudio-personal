import { describe, expect, it } from "vitest";
import { supported } from "./recallSummary/verify.js";

const snippet =
  "Decision: retry backoff starts at 250 ms and doubles up to 8 attempts, then the request fails.";

describe("supported", () => {
  it("accepts a rewording that keeps the snippet's figures", () => {
    expect(
      supported(
        "The retry backoff starts at 250 ms and doubles for up to 8 attempts.",
        snippet,
      ),
    ).toBe(true);
  });
  it("rejects a figure the snippet does not contain", () => {
    expect(supported("The retry backoff starts at 500 ms.", snippet)).toBe(
      false,
    );
  });
  it("rejects a sentence with nothing in common, or an empty one", () => {
    expect(supported("The sandbox forbids network access.", snippet)).toBe(
      false,
    );
    expect(supported("  ", snippet)).toBe(false);
  });
});
