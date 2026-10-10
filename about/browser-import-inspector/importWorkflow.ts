import type {
  BrowserDataClient,
  ImportJobSnapshot,
  NonSensitiveBrowserImportSelection,
  SensitiveBrowserImportRequest,
  SensitiveBrowserImportSelection,
  SensitiveBrowserImportStatus,
} from "@vibestudio/browser-data/client";

export interface SensitiveImportCheckpoint {
  request: SensitiveBrowserImportRequest;
  status: SensitiveBrowserImportStatus;
}

export interface SensitiveCheckpointStore {
  read(): SensitiveImportCheckpoint | null;
  write(checkpoint: SensitiveImportCheckpoint): void | Promise<void>;
}

export interface SelectedImportResult {
  job: ImportJobSnapshot | null;
  sensitiveStatus: SensitiveBrowserImportStatus | null;
  errors: unknown[];
}

export async function previewSelectedImports(
  client: BrowserDataClient,
  publicSelection: NonSensitiveBrowserImportSelection | null,
  sensitiveSelection: SensitiveBrowserImportSelection | null
) {
  if (!publicSelection && !sensitiveSelection) {
    throw new Error("Select at least one browser data category to review.");
  }
  const [publicPreview, sensitivePreview] = await Promise.all([
    publicSelection ? client.previewImport(publicSelection) : Promise.resolve(null),
    sensitiveSelection ? client.previewSensitiveImport(sensitiveSelection) : Promise.resolve(null),
  ]);
  return { publicPreview, sensitivePreview };
}

export async function startSelectedImports(
  client: BrowserDataClient,
  checkpointStore: SensitiveCheckpointStore,
  publicSelection: NonSensitiveBrowserImportSelection | null,
  sensitiveSelection: SensitiveBrowserImportSelection | null,
  createOperationId: () => string,
  report: (update: {
    publicOperationId?: string;
    sensitiveStatus?: SensitiveBrowserImportStatus;
  }) => void
): Promise<SelectedImportResult> {
  const pending = sensitiveSelection
    ? pendingSensitiveRequest(checkpointStore.read(), sensitiveSelection, createOperationId)
    : null;
  const previous = checkpointStore.read();
  const pendingStatus: SensitiveBrowserImportStatus | null = pending
    ? previous?.request.operationId === pending.operationId
      ? previous.status
      : // Local placeholder until the host answers; its version is never sent back.
        {
          operationId: pending.operationId,
          state: "running",
          counts: [],
          version: "unobserved",
        }
    : null;
  if (pending && pendingStatus) {
    await checkpointStore.write({ request: pending, status: pendingStatus });
  }

  const publicOperationId = publicSelection ? createOperationId() : null;
  // Dispatch each initiating call before publishing IDs to progress observers.
  const starting = Promise.allSettled([
    publicSelection && publicOperationId
      ? client.startImport(publicSelection, publicOperationId)
      : Promise.resolve(null),
    pending
      ? client.startSensitiveImport(pending).then(async (status) => {
          await checkpointStore.write({ request: pending, status });
          report({ sensitiveStatus: status });
          return status;
        })
      : Promise.resolve(null),
  ]);
  if (publicOperationId) report({ publicOperationId });
  if (pendingStatus) report({ sensitiveStatus: pendingStatus });
  const [publicResult, sensitiveResult] = await starting;
  const status =
    sensitiveResult.status === "fulfilled"
      ? sensitiveResult.value
      : pending
        ? (checkpointStore.read()?.status ?? pendingStatus)
        : null;
  if (pending && status) await checkpointStore.write({ request: pending, status });
  return {
    job: publicResult.status === "fulfilled" ? publicResult.value : null,
    sensitiveStatus: status,
    errors: [publicResult, sensitiveResult]
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) => result.reason),
  };
}

/**
 * Read the checkpointed import's aggregate status. Pass the `version` of a
 * status the host returned to wait for its next change instead of re-reading.
 */
export async function observeSensitiveCheckpoint(
  client: BrowserDataClient,
  checkpointStore: SensitiveCheckpointStore,
  afterVersion?: string,
  signal?: AbortSignal
): Promise<SensitiveBrowserImportStatus | null> {
  const checkpoint = checkpointStore.read();
  if (
    !checkpoint ||
    !["running", "applying", "application_failed"].includes(checkpoint.status.state)
  ) {
    return checkpoint?.status ?? null;
  }
  const status = await client.observeSensitiveImport(checkpoint.request.operationId, {
    afterVersion,
    signal,
  });
  signal?.throwIfAborted();
  if (checkpointStore.read()?.request.operationId !== checkpoint.request.operationId) return null;
  await checkpointStore.write({ request: checkpoint.request, status });
  return status;
}

export async function cancelSelectedImports(
  client: BrowserDataClient,
  checkpointStore: SensitiveCheckpointStore,
  job: ImportJobSnapshot | null,
  sensitiveStatus: SensitiveBrowserImportStatus | null
): Promise<SelectedImportResult> {
  const publicPromise =
    job && !isTerminal(job.phase)
      ? client.cancelImport(job.jobId).then(() => client.getImportJob(job.jobId))
      : Promise.resolve(job);
  const sensitivePromise =
    sensitiveStatus && ["running", "applying", "application_failed"].includes(sensitiveStatus.state)
      ? client.cancelSensitiveImport(sensitiveStatus.operationId)
      : Promise.resolve(sensitiveStatus);
  const [publicResult, sensitiveResult] = await Promise.allSettled([
    publicPromise,
    sensitivePromise,
  ]);
  const nextSensitive =
    sensitiveResult.status === "fulfilled" ? sensitiveResult.value : sensitiveStatus;
  const checkpoint = checkpointStore.read();
  if (checkpoint && nextSensitive && checkpoint.request.operationId === nextSensitive.operationId) {
    await checkpointStore.write({
      request: checkpoint.request,
      status: nextSensitive,
    });
  }
  return {
    job: publicResult.status === "fulfilled" ? publicResult.value : job,
    sensitiveStatus: nextSensitive,
    errors: [publicResult, sensitiveResult]
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) => result.reason),
  };
}

function pendingSensitiveRequest(
  checkpoint: SensitiveImportCheckpoint | null,
  selection: SensitiveBrowserImportSelection,
  createOperationId: () => string
): SensitiveBrowserImportRequest {
  if (
    checkpoint &&
    ["running", "applying", "application_failed"].includes(checkpoint.status.state) &&
    sameSelection(checkpoint.request, selection)
  ) {
    return checkpoint.request;
  }
  return { ...selection, operationId: createOperationId() };
}

function sameSelection(
  existing: SensitiveBrowserImportSelection,
  requested: SensitiveBrowserImportSelection
): boolean {
  return (
    existing.hostId === requested.hostId &&
    existing.sourceId === requested.sourceId &&
    existing.dataTypes.length === requested.dataTypes.length &&
    existing.dataTypes.every((dataType, index) => dataType === requested.dataTypes[index])
  );
}

function isTerminal(phase: ImportJobSnapshot["phase"]): boolean {
  return ["complete", "cancelled", "failed", "partial"].includes(phase);
}
