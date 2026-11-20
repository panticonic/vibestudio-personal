import { isDeepStrictEqual } from "node:util";
import { contextId, rpc } from "@workspace/runtime";
import { mainRpcMethods } from "@vibestudio/service-schemas/mainRpc";
import { createRpcMethods } from "@vibestudio/shared/rpcMethods";
import { browserProductMethods } from "@vibestudio/service-schemas/browserData";
import type {
  BrowserImportReviewReport,
  BrowserImportReviewRequest,
  ImportPreviewObservation,
  ImportSourceObservation,
  RetainedImportObservation,
} from "../browser-import-review/types.js";
import { bindBrowserImportReview } from "./index.js";

const importStoreMethods = createRpcMethods(
  "browserData",
  {
    upsertImportJob: browserProductMethods.upsertImportJob,
    getImportJob: browserProductMethods.getImportJob,
  },
  "",
);

type Read = "source" | "preview" | "history";
type World = {
  id: string;
  goal: string;
  kind: BrowserImportReviewRequest["kind"];
  categories: Readonly<BrowserImportReviewRequest["categories"]>;
  source: Readonly<{
    state: ImportSourceObservation["state"];
    categories: readonly BrowserImportReviewRequest["categories"][number][];
  }>;
  dropSourceBeforePreview: boolean;
  preview:
    | (Omit<ImportPreviewObservation, "totals"> & {
        totals: Readonly<ImportPreviewObservation["totals"]>;
      })
    | null;
  job:
    | (Omit<RetainedImportObservation, "progress"> & {
        progress: Readonly<RetainedImportObservation["progress"]>;
      })
    | null;
  reads: readonly Read[];
  expected: {
    next: BrowserImportReviewReport["next"];
    source: World["source"] | null;
    totals: Readonly<BrowserImportReviewReport["totals"]>;
    progress: Readonly<BrowserImportReviewReport["progress"]>;
  };
};

export async function prepareManagedBrowserImport(world: World) {
  if (!contextId)
    throw new Error("Browser import fixtures require an owning test context");
  const id = `browser-import-fixture-${crypto.randomUUID()}`;
  const hostId = "migration-host",
    sourceId = "selected-firefox";
  const categories = [...world.categories];
  const request: BrowserImportReviewRequest = {
    goal: world.goal,
    kind: world.kind,
    categories,
  };
  const { job, preview } = world;
  const dataStore = job
    ? await rpc.call("main", mainRpcMethods["runtime.createEntity"], [
        {
          kind: "do",
          execution: { surface: "code", source: "workers/browser-data" },
          className: "BrowserDataDO",
          key: id,
          contextId,
        },
      ])
    : null;
  if (
    dataStore &&
    (dataStore.kind !== "do" || dataStore.contextId !== contextId)
  ) {
    throw new Error("Browser import store differs from its fixture context");
  }

  const progress =
    job?.progress.map(({ category, stored, skipped, errors }) => ({
      dataType: category,
      stored,
      skipped,
      errors,
      itemsProcessed: stored + skipped + errors,
    })) ?? [];
  const receipt = {
    jobId: id,
    hostId,
    hostLabel: "Test host",
    sourceId,
    browser: "firefox",
    phase: job?.phase ?? "complete",
    resumable: job?.resumable ?? false,
    startedAt: 10,
    updatedAt: 20,
    finishedAt: 20,
    progress,
    warnings: [],
  };
  if (dataStore) {
    await rpc.call(dataStore.targetId, importStoreMethods.upsertImportJob, [
      { ...receipt, dataTypes: categories },
    ]);
  }
  const readPersisted = () =>
    dataStore
      ? rpc.call(dataStore.targetId, importStoreMethods.getImportJob, [id])
      : Promise.resolve(null);
  const initial = await readPersisted();

  let hostReads = 0;
  let previewCalls = 0;
  const binding = bindBrowserImportReview(
    { hostId, sourceId, categories, jobId: id },
    {
      async listImportHosts() {
        const connected = !(world.dropSourceBeforePreview && ++hostReads > 1);
        return [
          {
            hostId,
            connected,
            displayName: "Test host",
            platform: "linux",
            location: "device",
          },
        ];
      },
      async listImportSources(assigned) {
        if (assigned !== hostId) throw new Error("Wrong browser import host");
        return [
          {
            sourceId,
            browser: "firefox",
            displayName: "Assigned Firefox",
            localDataSetCount: 1,
            status: world.source.state === "available" ? "readable" : "blocked",
            supportedDataTypes: [...world.source.categories],
            warnings: [],
          },
        ];
      },
      async previewImport(selection) {
        if (
          selection.hostId !== hostId ||
          selection.sourceId !== sourceId ||
          !isDeepStrictEqual(selection.dataTypes, categories) ||
          preview?.status !== "previewed"
        ) {
          throw new Error(
            "Unexpected preview effect for the browser import assignment",
          );
        }
        previewCalls++;
        return {
          job: {
            ...receipt,
            requestedDataTypes: categories,
            warnings: Array<string>(preview.warningCount).fill("Test warning"),
          },
          breakdowns: preview.totals.map(({ category, total }) => ({
            dataType: category,
            groupedBy: "kind",
            total,
            groups: [],
            otherGroups: 0,
            otherItems: 0,
          })),
          openTabCount: 0,
          localDataSetCount: 1,
        };
      },
      getImportJob: async (requestedId) => {
        if (requestedId !== id) throw new Error("Wrong browser import receipt");
        return readPersisted();
      },
    },
  );
  const reads: { kind: Read; value: unknown }[] = [];
  async function record<T>(kind: Read, observe: () => Promise<T>) {
    if (world.reads[reads.length] !== kind)
      throw new Error("Unexpected browser migration read");
    const value = await observe();
    reads.push({ kind, value });
    return value;
  }
  const services = {
    browserImportSource: {
      observe: () => record("source", binding.browserImportSource.observe),
    },
    browserImportPreview: {
      observe: () => record("preview", binding.browserImportPreview.observe),
    },
    browserImportHistory: {
      observe: () => record("history", binding.browserImportHistory.observe),
    },
  };
  async function verify(report: BrowserImportReviewReport | null) {
    const values = { source: world.source, preview, history: job };
    const { findings: _findings, ...decision } = report ?? {};
    const persisted = await readPersisted();
    const checks = {
      exactReads: isDeepStrictEqual(
        reads,
        world.reads.map((kind) => ({ kind, value: values[kind] })),
      ),
      exactReport: isDeepStrictEqual(decision, world.expected),
      retainedState:
        isDeepStrictEqual(persisted, initial) &&
        (!job || initial?.phase === job.phase),
      previewCalls: previewCalls === (preview?.status === "previewed" ? 1 : 0),
    };
    return {
      caseId: world.id,
      request,
      reads,
      checks,
      passed: Object.values(checks).every(Boolean),
    };
  }

  return {
    request,
    services,
    verify,
    async qualify() {
      const byRead = {
        source: services.browserImportSource.observe,
        preview: services.browserImportPreview.observe,
        history: services.browserImportHistory.observe,
      };
      for (const kind of world.reads) await byRead[kind]();
      const report = {
        ...world.expected,
        source: world.expected.source && {
          ...world.expected.source,
          categories: [...world.expected.source.categories],
        },
        totals: [...world.expected.totals],
        progress: [...world.expected.progress],
        findings: [],
      };
      let rejectedExtraRead = false;
      try {
        await services.browserImportPreview.observe();
      } catch (error) {
        rejectedExtraRead =
          error instanceof Error &&
          error.message === "Unexpected browser migration read";
      }
      return { verification: await verify(report), rejectedExtraRead };
    },
  };
}
