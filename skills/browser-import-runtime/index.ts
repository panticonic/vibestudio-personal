import { browserData } from "@workspace/runtime";
import type {
  BrowserImportDispatch,
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

export type BrowserImportExecutionAssignment = Omit<
  BrowserImportReviewAssignment,
  "jobId"
> & {
  operationId: string;
  approvedPreview: ImportPreviewObservation;
};

type BrowserImportReadClient = Pick<
  typeof browserData,
  "listImportHosts" | "listImportSources" | "previewImport" | "getImportJob"
>;

type BrowserImportExecutionClient = BrowserImportReadClient &
  Pick<typeof browserData, "startImport">;

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

export function bindBrowserImportExecution(
  assignment: BrowserImportExecutionAssignment,
  client: BrowserImportExecutionClient = browserData,
) {
  const { hostId, sourceId, operationId } = assignment;
  const categories = [...assignment.categories];
  const approved = structuredClone(assignment.approvedPreview);
  if (!operationId.trim() || operationId.length > 200) {
    throw new Error("Assign the caller's stable browser import operation ID");
  }
  const review = bindBrowserImportReview(
    { hostId, sourceId, categories, jobId: operationId },
    client,
  );
  function matchesApproval(observation: ImportPreviewObservation) {
    if (
      approved.status !== "previewed" ||
      observation.status !== "previewed" ||
      approved.warningCount !== observation.warningCount ||
      approved.totals.length !== categories.length ||
      observation.totals.length !== categories.length
    )
      return false;
    const observedCounts = new Map(
      observation.totals.map(({ category, total }) => [category, total]),
    );
    const approvedCounts = new Map(
      approved.totals.map(({ category, total }) => [category, total]),
    );
    return categories.every((category) => {
      const total = approvedCounts.get(category);
      return (
        typeof total === "number" &&
        Number.isSafeInteger(total) &&
        total >= 0 &&
        observedCounts.get(category) === total
      );
    });
  }
  let lastPreview: ImportPreviewObservation | undefined;
  let pending: Promise<BrowserImportDispatch> | undefined;
  return {
    ...review,
    browserImportPreview: {
      async observe() {
        const observed = await review.browserImportPreview.observe();
        lastPreview = structuredClone(observed);
        return observed;
      },
    },
    browserImportStart: {
      async start(
        observed: ImportPreviewObservation,
      ): Promise<BrowserImportDispatch> {
        if (
          !lastPreview ||
          !matchesApproval(lastPreview) ||
          !matchesApproval(observed)
        )
          return "held";
        if (!pending) {
          pending = (async () => {
            const source = await review.browserImportSource.observe();
            if (
              source.state !== "available" ||
              !categories.every((category) =>
                source.categories.includes(category),
              ) ||
              !lastPreview ||
              !matchesApproval(lastPreview)
            )
              return "held";
            const job = await client.startImport(
              { hostId, sourceId, dataTypes: categories },
              operationId,
            );
            if (
              job.jobId !== operationId ||
              job.hostId !== hostId ||
              job.sourceId !== sourceId ||
              job.requestedDataTypes.length !== categories.length ||
              !categories.every((category) =>
                job.requestedDataTypes.includes(category),
              )
            ) {
              throw new Error(
                "Started browser import differs from its assigned operation",
              );
            }
            return "started";
          })();
          const started = pending;
          void started.then(
            (status) => {
              if (status === "held" && pending === started) pending = undefined;
            },
            () => {
              if (pending === started) pending = undefined;
            },
          );
        }
        return pending;
      },
    },
  };
}
