import { isDeepStrictEqual } from "node:util";
import { contextId, rpc } from "@workspace/runtime";
import { mainRpcMethods } from "@vibestudio/service-schemas/mainRpc";
import {
  BrowserImportCoordinator,
  type BrowserImportProvider,
  type ImportedBookmark,
} from "@vibestudio/browser-data";
import {
  createReceiverRpcMethods,
  createRpcMethods,
} from "@vibestudio/shared/rpcMethods";
import { browserProductMethods } from "@vibestudio/service-schemas/browserData";
import type {
  BrowserImportDispatch,
  BrowserImportReviewReport,
  BrowserImportReviewRequest,
  ImportPreviewObservation,
  ImportSourceObservation,
  RetainedImportObservation,
} from "../browser-import-review/types.js";
import {
  bindBrowserImportExecution,
  bindBrowserImportReview,
} from "./index.js";

const importStoreMethods = createRpcMethods(
  "browserData",
  {
    seedImportReceipt: browserProductMethods.upsertImportJob,
    readImportReceipt: browserProductMethods.getImportJob,
  },
  "",
);

const batchMethods = createReceiverRpcMethods<{
  storeFixtureBookmarks(
    id: string,
    batchIndex: number,
    bookmarks: ImportedBookmark[],
    sourceId: string,
  ): Promise<{ stored: boolean }>;
  readFixtureBookmarks(
    id: string,
  ): Promise<{ title: string; url: string | null }[]>;
}>(["storeFixtureBookmarks", "readFixtureBookmarks"]);

type Read = "source" | "preview" | "history" | "start";
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
  execution?: {
    approvedPreview: Omit<ImportPreviewObservation, "totals"> & {
      totals: Readonly<ImportPreviewObservation["totals"]>;
    };
    start: BrowserImportDispatch | null;
    bookmarks: readonly { title: string; url: string }[];
  };
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
  const { execution, job, preview } = world;
  const request: BrowserImportReviewRequest =
    world.kind === "execute"
      ? {
          goal: world.goal,
          kind: world.kind,
          categories,
          approvedPreview: {
            ...execution!.approvedPreview,
            totals: [...execution!.approvedPreview.totals],
          },
        }
      : { goal: world.goal, kind: world.kind, categories };
  const dataStore =
    job || execution
      ? await rpc.call("main", mainRpcMethods["runtime.createEntity"], [
          {
            kind: "do",
            execution: {
              surface: "code",
              source: "workers/browser-import-fixture",
            },
            className: "BrowserImportFixtureStore",
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
  if (dataStore && job && !execution) {
    await rpc.call(dataStore.targetId, importStoreMethods.seedImportReceipt, [
      { ...receipt, dataTypes: categories },
    ]);
  }
  const readPersisted = () =>
    dataStore
      ? rpc.call(dataStore.targetId, importStoreMethods.readImportReceipt, [id])
      : Promise.resolve(null);
  const initial = await readPersisted();

  let hostReads = 0;
  let previewCalls = 0;
  const identity = {
    workspaceId: contextId,
    ownerUserId: contextId,
    environmentKey: id,
  };
  const coordinator = new BrowserImportCoordinator({
    getJob: readPersisted,
    async persistJob(_identity, snapshot) {
      if (!dataStore) throw new Error("Import receipt has no fixture store");
      await rpc.call(dataStore.targetId, importStoreMethods.seedImportReceipt, [
        {
          ...receipt,
          phase: snapshot.phase,
          resumable: snapshot.resumable,
          startedAt: snapshot.startedAt,
          updatedAt: snapshot.updatedAt,
          finishedAt: snapshot.finishedAt,
          warnings: snapshot.warnings,
          progress: snapshot.progress,
          error: snapshot.error,
          dataTypes: snapshot.requestedDataTypes,
        },
      ]);
    },
    async storeBatch(_identity, batch) {
      if (
        !dataStore ||
        batch.jobId !== id ||
        batch.sourceId !== sourceId ||
        batch.dataType !== "bookmarks"
      ) {
        throw new Error("Unexpected fixture batch");
      }
      const stored = await rpc.call(
        dataStore.targetId,
        batchMethods.storeFixtureBookmarks,
        [id, batch.batchIndex, batch.items as ImportedBookmark[], sourceId],
      );
      if (!stored.stored) throw new Error("Fixture batch was submitted twice");
    },
  });
  let starts = 0;
  const readClient = {
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
    async listImportSources(assigned: string) {
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
    async previewImport(selection: {
      hostId: string;
      sourceId: string;
      dataTypes: readonly string[];
    }) {
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
    getImportJob: async (requestedId: string) => {
      if (requestedId !== id) throw new Error("Wrong browser import receipt");
      return readPersisted();
    },
  } satisfies Parameters<typeof bindBrowserImportReview>[1];
  const provider: BrowserImportProvider = {
    listSources: () => readClient.listImportSources(hostId),
    async preview() {
      throw new Error("Fixture start does not preview again");
    },
    async listOpenTabs() {
      return [];
    },
    async openImport(assignedSource, dataTypes) {
      if (
        assignedSource !== sourceId ||
        !isDeepStrictEqual(dataTypes, categories) ||
        !execution?.bookmarks.length
      )
        throw new Error("Unexpected import source");
      starts++;
      const bookmarks = execution.bookmarks.map((item) => ({
        ...item,
        folder: ["Migration"],
        dateAdded: 10,
      }));
      return {
        async consume(sink) {
          await sink.store({
            jobId: id,
            sourceId,
            dataType: "bookmarks",
            batchIndex: 0,
            idempotencyKey: "",
            items: bookmarks,
          });
          const dataTypes = categories.map((dataType) => {
            const stored = dataType === "bookmarks" ? bookmarks.length : 0;
            return {
              dataType,
              itemsProcessed: stored,
              stored,
              skipped: 0,
              errors: 0,
            };
          });
          for (const row of dataTypes) await sink.progress(row);
          return { dataTypes, warnings: [] };
        },
      };
    },
  };
  const execute =
    request.kind === "execute"
      ? bindBrowserImportExecution(
          {
            hostId,
            sourceId,
            categories,
            operationId: id,
            approvedPreview: request.approvedPreview,
          },
          {
            ...readClient,
            async startImport(selection, operationId) {
              await coordinator.start(identity, selection, operationId);
              return coordinator.waitForJob(identity, operationId);
            },
          },
        )
      : null;
  if (execute) {
    const [host] = await readClient.listImportHosts();
    coordinator.registerHost({
      ...host!,
      ownerUserId: identity.ownerUserId,
      provider,
    });
  }
  const binding =
    execute ??
    bindBrowserImportReview(
      { hostId, sourceId, categories, jobId: id },
      readClient,
    );

  const reads: { kind: Read; value: unknown }[] = [];
  async function record<T>(kind: Read, observe: () => Promise<T>) {
    if (world.reads[reads.length] !== kind)
      throw new Error("Unexpected browser migration read");
    const value = await observe();
    reads.push({ kind, value });
    return value;
  }
  const start = async (observed: ImportPreviewObservation) =>
    execute
      ? record("start", () => execute.browserImportStart.start(observed))
      : ("held" as const);
  const services = {
    ...(execute && { browserImportStart: { start } }),
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
    const values = {
      source: world.source,
      preview,
      history: job,
      start: execution?.start,
    };
    const { findings: _findings, ...decision } = report ?? {};
    const persisted = await readPersisted();
    const bookmarks =
      dataStore && execution
        ? await rpc.call(
            dataStore.targetId,
            batchMethods.readFixtureBookmarks,
            [id],
          )
        : [];
    const checks = {
      exactReads: isDeepStrictEqual(
        reads,
        world.reads.map((kind) => ({ kind, value: values[kind] })),
      ),
      exactReport: isDeepStrictEqual(decision, world.expected),
      retainedState: execution
        ? starts === (execution.start === "started" ? 1 : 0) &&
          persisted?.phase === job?.phase &&
          isDeepStrictEqual(bookmarks, execution.bookmarks)
        : isDeepStrictEqual(persisted, initial) &&
          (!job || initial?.phase === job.phase),
      previewCalls: previewCalls === (preview?.status === "previewed" ? 1 : 0),
    };
    return {
      caseId: world.id,
      request,
      reads,
      ...(execution && {
        importReadback: { starts, phase: persisted?.phase ?? null, bookmarks },
      }),
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
      if (
        execute &&
        request.kind === "execute" &&
        (await execute.browserImportStart.start(request.approvedPreview)) !==
          "held"
      )
        throw new Error("Import must be held before a preview");
      for (const kind of world.reads) {
        if (kind === "start") {
          await start(
            reads.find((read) => read.kind === "preview")!
              .value as ImportPreviewObservation,
          );
        } else {
          await byRead[kind]();
        }
      }
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
