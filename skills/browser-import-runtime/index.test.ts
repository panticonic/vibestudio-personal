import { describe, expect, it, vi } from "vitest";
import {
  bindBrowserImportExecution,
  bindBrowserImportReview,
} from "./index.js";

vi.mock("@workspace/runtime", () => ({ browserData: {} }));

const assignment = {
  hostId: "assigned-host",
  sourceId: "assigned-source",
  categories: ["bookmarks", "history"],
  jobId: "assigned-job",
} as const;

function client() {
  return {
    listImportHosts: vi.fn().mockResolvedValue([
      { hostId: "other-host", connected: true },
      { hostId: assignment.hostId, connected: true },
    ]),
    listImportSources: vi.fn().mockResolvedValue([
      {
        sourceId: "other-source",
        status: "readable",
        supportedDataTypes: ["bookmarks", "history"],
      },
      {
        sourceId: assignment.sourceId,
        status: "readable",
        supportedDataTypes: ["bookmarks", "history", "cookies"],
      },
    ]),
    previewImport: vi.fn().mockResolvedValue({
      job: {
        hostId: assignment.hostId,
        sourceId: assignment.sourceId,
        requestedDataTypes: ["history", "bookmarks"],
        warnings: ["A source warning"],
      },
      breakdowns: [
        { dataType: "history", total: 0 },
        {
          dataType: "bookmarks",
          total: 4,
          groups: [{ label: "masked.example", count: 4 }],
        },
      ],
    }),
    getImportJob: vi.fn().mockResolvedValue({
      jobId: assignment.jobId,
      hostId: assignment.hostId,
      sourceId: assignment.sourceId,
      requestedDataTypes: ["bookmarks", "history"],
      phase: "partial",
      resumable: true,
      progress: [
        { dataType: "bookmarks", stored: 4, skipped: 1, errors: 0 },
        { dataType: "history", stored: 2, skipped: 0, errors: 1 },
        { dataType: "favicons", stored: 3, skipped: 0, errors: 0 },
      ],
    }),
  };
}

describe("browser migration review binding", () => {
  it("shows only assigned public source information and previews the exact selection", async () => {
    const source = client();
    const review = bindBrowserImportReview(assignment, source);
    await expect(review.browserImportSource.observe()).resolves.toEqual({
      state: "available",
      categories: ["bookmarks", "history"],
    });
    await expect(review.browserImportPreview.observe()).resolves.toEqual({
      status: "previewed",
      warningCount: 1,
      totals: [
        { category: "history", total: 0 },
        { category: "bookmarks", total: 4 },
      ],
    });
    expect(source.listImportSources.mock.calls).toEqual([
      [assignment.hostId],
      [assignment.hostId],
    ]);
    expect(source.previewImport.mock.calls).toEqual([
      [
        {
          hostId: assignment.hostId,
          sourceId: assignment.sourceId,
          dataTypes: ["bookmarks", "history"],
        },
      ],
    ]);
  });

  it("holds the preview if the original source disappears before the preview call", async () => {
    const source = client();
    const review = bindBrowserImportReview(assignment, source);
    await expect(review.browserImportSource.observe()).resolves.toMatchObject({
      state: "available",
    });
    source.listImportHosts.mockResolvedValue([
      { hostId: assignment.hostId, connected: false },
    ]);
    await expect(review.browserImportPreview.observe()).resolves.toEqual({
      status: "source-changed",
      totals: [],
      warningCount: 0,
    });
    expect(source.previewImport).not.toHaveBeenCalled();
  });

  it("preserves retained progress without exposing other categories or receiving arbitrary job IDs", async () => {
    const source = client();
    const review = bindBrowserImportReview(assignment, source);
    await expect(review.browserImportHistory.observe()).resolves.toEqual({
      phase: "partial",
      resumable: true,
      progress: [
        { category: "bookmarks", stored: 4, skipped: 1, errors: 0 },
        { category: "history", stored: 2, skipped: 0, errors: 1 },
      ],
    });
    expect(source.getImportJob.mock.calls).toEqual([[assignment.jobId]]);
    expect(source.listImportHosts).not.toHaveBeenCalled();
    const other = {
      ...(await source.getImportJob()),
      sourceId: "other-source",
    };
    source.getImportJob.mockResolvedValue(other);
    await expect(review.browserImportHistory.observe()).resolves.toBeNull();
  });
});

const approvedPreview = {
  status: "previewed",
  totals: [
    { category: "bookmarks", total: 4 },
    { category: "history", total: 0 },
  ],
  warningCount: 1,
} satisfies import("../browser-import-review/types.js").ImportPreviewObservation;

function execution() {
  const source = client();
  const startImport = vi.fn(() => source.getImportJob());
  const service = bindBrowserImportExecution(
    { ...assignment, operationId: assignment.jobId, approvedPreview },
    { ...source, startImport },
  );
  return { source, startImport, service };
}

it("joins concurrent starts to the caller's one approved operation", async () => {
  const { service, startImport } = execution();
  await expect(service.browserImportStart.start(approvedPreview)).resolves.toBe(
    "held",
  );
  const observed = await service.browserImportPreview.observe();
  await expect(
    Promise.all([
      service.browserImportStart.start(observed),
      service.browserImportStart.start(approvedPreview),
    ]),
  ).resolves.toEqual(["started", "started"]);
  expect(startImport.mock.calls).toEqual([
    [
      {
        hostId: assignment.hostId,
        sourceId: assignment.sourceId,
        dataTypes: assignment.categories,
      },
      assignment.jobId,
    ],
  ]);
});

it("holds if the source loses a category after preview", async () => {
  const { source, service, startImport } = execution();
  const observed = await service.browserImportPreview.observe();
  source.listImportSources.mockResolvedValue([
    {
      sourceId: assignment.sourceId,
      status: "readable",
      supportedDataTypes: ["bookmarks"],
    },
  ]);
  await expect(service.browserImportStart.start(observed)).resolves.toBe(
    "held",
  );
  expect(startImport).not.toHaveBeenCalled();
});

it("requires the adapter's own fresh counts even when the model supplies the approved counts", async () => {
  const { source, service, startImport } = execution();
  const preview = await source.previewImport();
  preview.breakdowns[0].total = 1;
  await service.browserImportPreview.observe();
  await expect(service.browserImportStart.start(approvedPreview)).resolves.toBe(
    "held",
  );
  expect(startImport).not.toHaveBeenCalled();
});
