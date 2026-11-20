import { browserData } from "@workspace/runtime";
import type {
  ImportPreviewObservation,
  ImportSourceObservation,
  PublicImportCategory,
  RetainedImportObservation,
} from "../browser-import-review/types.js";

export type BrowserImportReviewAssignment = {
  hostId: string;
  sourceId: string;
  categories: readonly PublicImportCategory[];
  jobId?: string;
};

type BrowserImportReadClient = Pick<
  typeof browserData,
  "listImportHosts" | "listImportSources" | "previewImport" | "getImportJob"
>;

function isPublicCategory(category: string): category is PublicImportCategory {
  return ["bookmarks", "history", "searchEngines", "favicons"].includes(
    category,
  );
}

export function bindBrowserImportReview(
  assignment: BrowserImportReviewAssignment,
  client: BrowserImportReadClient = browserData,
) {
  const { hostId, sourceId, jobId } = assignment;
  const categories = [...assignment.categories];
  if (
    !categories.length ||
    new Set(categories).size !== categories.length ||
    !categories.every(isPublicCategory)
  ) {
    throw new Error("Assign unique public browser import categories");
  }
  const selection = { hostId, sourceId, dataTypes: categories };
  const matchesCategories = (observed: readonly string[]) =>
    observed.length === categories.length &&
    categories.every((category) => observed.includes(category));

  async function observeSource(): Promise<ImportSourceObservation> {
    const host = (await client.listImportHosts()).find(
      (row) => row.hostId === hostId,
    );
    if (!host?.connected) return { state: "host-unavailable", categories: [] };
    const source = (await client.listImportSources(hostId)).find(
      (row) => row.sourceId === sourceId,
    );
    if (!source) return { state: "source-unavailable", categories: [] };
    return {
      state: source.status === "readable" ? "available" : "blocked",
      categories: source.supportedDataTypes.filter(isPublicCategory),
    };
  }
  return {
    browserImportSource: { observe: observeSource },
    browserImportPreview: {
      async observe(): Promise<ImportPreviewObservation> {
        const source = await observeSource();
        if (
          source.state !== "available" ||
          !categories.every((category) => source.categories.includes(category))
        ) {
          return { status: "source-changed", totals: [], warningCount: 0 };
        }
        const preview = await client.previewImport(selection);
        if (
          preview.job.hostId !== hostId ||
          preview.job.sourceId !== sourceId ||
          !matchesCategories(preview.job.requestedDataTypes)
        ) {
          throw new Error("Browser import preview differs from the assignment");
        }
        return {
          status: "previewed",
          totals: preview.breakdowns.flatMap(({ dataType, total }) =>
            isPublicCategory(dataType) ? [{ category: dataType, total }] : [],
          ),
          warningCount: preview.job.warnings.length,
        };
      },
    },
    browserImportHistory: {
      async observe(): Promise<RetainedImportObservation | null> {
        if (!jobId) return null;
        const job = await client.getImportJob(jobId);
        if (
          !job ||
          job.jobId !== jobId ||
          job.hostId !== hostId ||
          job.sourceId !== sourceId ||
          !matchesCategories(job.requestedDataTypes)
        )
          return null;
        return {
          phase: job.phase,
          resumable: job.resumable,
          progress: job.progress.flatMap(
            ({ dataType, stored, skipped, errors }) =>
              isPublicCategory(dataType) && categories.includes(dataType)
                ? [{ category: dataType, stored, skipped, errors }]
                : [],
          ),
        };
      },
    },
  };
}
