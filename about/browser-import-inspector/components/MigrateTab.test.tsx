// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ImportJobSnapshot } from "@vibestudio/browser-data/client";
import type { ImportSourceSelection } from "./ImportSourceRail";

const fixtures = vi.hoisted(() => ({
  browserData: {
    listImportJobs: vi.fn(),
    startImport: vi.fn(),
    observeImportJob: vi.fn(),
    cancelImport: vi.fn(),
  },
  stateArgs: { get: () => ({}), patch: vi.fn(async () => undefined) },
}));

vi.mock("@workspace/runtime", () => ({
  browserData: fixtures.browserData,
  panel: { stateArgs: fixtures.stateArgs },
}));

import { MigrateTab } from "./MigrateTab";

const selection: ImportSourceSelection = {
  host: {
    hostId: "desktop-1",
    displayName: "This device",
    platform: "linux",
    location: "device",
    connected: true,
  },
  source: {
    sourceId: "chrome-default",
    browser: "chrome",
    displayName: "Chrome",
    status: "readable",
    localDataSetCount: 1,
    supportedDataTypes: ["bookmarks"],
    warnings: [],
  },
};

function snapshot(
  phase: ImportJobSnapshot["phase"],
  itemsProcessed = 0,
  totalItems = 20
): ImportJobSnapshot {
  return {
    jobId: "import-1",
    hostId: selection.host.hostId,
    hostLabel: selection.host.displayName,
    sourceId: selection.source.sourceId,
    browser: selection.source.browser,
    phase,
    requestedDataTypes: ["bookmarks"],
    startedAt: 100,
    updatedAt: 200 + itemsProcessed,
    ...(phase === "complete" ? { finishedAt: 500 } : {}),
    progress: [
      {
        dataType: "bookmarks",
        itemsProcessed,
        totalItems,
        stored: itemsProcessed,
        skipped: 0,
        errors: 0,
      },
    ],
    warnings: [],
    resumable: phase !== "complete",
  };
}

interface PendingObservation {
  afterVersion?: string;
  signal: AbortSignal;
  settled: boolean;
  resolve(value: { job: ImportJobSnapshot; version: string }): void;
  reject(cause: unknown): void;
}

const observations: PendingObservation[] = [];

function nextObservation(): PendingObservation | undefined {
  return [...observations].reverse().find(({ settled, signal }) => !settled && !signal.aborted);
}

function resolveNext(job: ImportJobSnapshot, version: string): void {
  const pending = nextObservation();
  if (!pending) throw new Error("No active import observation is waiting");
  pending.settled = true;
  pending.resolve({ job, version });
}

function rejectNext(cause: unknown): void {
  const pending = nextObservation();
  if (!pending) throw new Error("No active import observation is waiting");
  pending.settled = true;
  pending.reject(cause);
}

async function startImport(view = render(<MigrateTab selection={selection} now={500} />)) {
  fireEvent.click(screen.getByRole("button", { name: /Import everything/ }));
  await waitFor(() => expect(fixtures.browserData.startImport).toHaveBeenCalledOnce());
  await screen.findByText("Importing browser data");
  await waitFor(() => expect(nextObservation()).toBeDefined());
  return view;
}

describe("MigrateTab public import observation", () => {
  beforeEach(() => {
    observations.length = 0;
    fixtures.browserData.listImportJobs.mockReset().mockResolvedValue([]);
    fixtures.browserData.startImport.mockReset().mockResolvedValue(snapshot("reading"));
    fixtures.browserData.cancelImport.mockReset().mockResolvedValue(undefined);
    fixtures.browserData.observeImportJob.mockReset().mockImplementation(
      (_jobId: string, options: { afterVersion?: string; signal: AbortSignal }) =>
        new Promise((resolve, reject) => {
          const pending: PendingObservation = {
            afterVersion: options.afterVersion,
            signal: options.signal,
            settled: false,
            resolve: (value) => resolve(value),
            reject: (cause) => reject(cause),
          };
          observations.push(pending);
          const abort = () => {
            pending.settled = true;
            options.signal.removeEventListener("abort", abort);
            reject(options.signal.reason ?? new Error("Observation cancelled"));
          };
          const resolvePending = pending.resolve;
          pending.resolve = (value) => {
            options.signal.removeEventListener("abort", abort);
            resolvePending(value);
          };
          const rejectPending = pending.reject;
          pending.reject = (cause) => {
            options.signal.removeEventListener("abort", abort);
            rejectPending(cause);
          };
          if (options.signal.aborted) abort();
          else options.signal.addEventListener("abort", abort, { once: true });
        })
    );
  });

  afterEach(() => cleanup());

  it("advances by the published version and stops observing at terminal completion", async () => {
    await startImport();

    await act(async () => resolveNext(snapshot("reading"), "published-1"));
    await waitFor(() =>
      expect(observations.some((item) => item.afterVersion === "published-1" && !item.signal.aborted)).toBe(
        true
      )
    );

    await act(async () => resolveNext(snapshot("reading", 12), "published-2"));
    await screen.findByText("12 of 20 processed");
    await waitFor(() =>
      expect(observations.some((item) => item.afterVersion === "published-2" && !item.signal.aborted)).toBe(
        true
      )
    );

    await act(async () => resolveNext(snapshot("complete", 20), "published-3"));
    await screen.findByText("Browser records complete");
    await act(async () => Promise.resolve());

    expect(nextObservation()).toBeUndefined();
    expect(observations.some((item) => item.afterVersion === "published-3")).toBe(false);
  });

  it("aborts only the panel's observation when unmounted", async () => {
    const view = await startImport();
    const active = nextObservation();
    expect(active).toBeDefined();

    view.unmount();

    expect(active!.signal.aborted).toBe(true);
    expect(fixtures.browserData.cancelImport).not.toHaveBeenCalled();
  });

  it("shows provider observation failures while leaving the import uncancelled", async () => {
    await startImport();

    await act(async () => rejectNext(new Error("Import host disconnected")));

    expect(
      await screen.findByText(
        "Lost contact with the import while it was running: Import host disconnected"
      )
    ).toBeTruthy();
    expect(fixtures.browserData.cancelImport).not.toHaveBeenCalled();
  });
});
