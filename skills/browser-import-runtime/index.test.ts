import { describe, expect, it, vi } from "vitest";
import { bindBrowserImportReview } from "./index.js";

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
