import { afterEach, describe, expect, it, vi } from "vitest";

const root = vi.hoisted(() => vi.fn());
vi.mock("./recallSummary.nl", () => ({ default: root }));
import { recall } from "./natlang.js";

afterEach(() => {
  vi.useRealTimers();
  root.mockReset();
});

describe("memory invocation snapshot", () => {
  it("keeps a recorded age reference when replaying years later through the natural-language root", async () => {
    const saved = Date.parse("2026-11-17T00:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
    const result = { query: "policy", facts: [], evidence: [], nothingFound: true, note: "checked" };
    root.mockResolvedValue(result);
    expect(await recall("policy", saved)).toBe(result);
    expect(root).toHaveBeenCalledWith("policy", saved);
  });

  it("captures the default age reference before the root starts asynchronous work", async () => {
    vi.useFakeTimers();
    const started = Date.parse("2026-11-17T00:00:00Z");
    vi.setSystemTime(started);
    root.mockImplementation(async () => {
      vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
      return "completed";
    });
    await recall("policy");
    expect(root).toHaveBeenCalledWith("policy", started);
  });
});
