import { createDurableObjectServiceClient } from "@vibestudio/service-schemas/clients/durableObjectServiceClient";
import { missionsRpcMethods } from "@vibestudio/service-schemas/missions";
import { modelSettingsRpcMethods } from "@workspace/model-catalog/rpc-contract";
import { mainRpcMethods } from "@vibestudio/service-schemas/mainRpc";
import { EventsClient } from "@vibestudio/service-schemas/clients/eventsClient";
import {
  readEventWatchRecords,
  type EventName,
} from "@vibestudio/shared/events";
import { isRpcAbortedBy } from "@vibestudio/rpc";
import { rpc } from "@workspace/runtime";

export interface SetupObservationDependencies {
  watch(signal: AbortSignal): Promise<AsyncIterable<{ kind: string }>>;
  owners: readonly ((
    afterVersion: string | undefined,
    signal: AbortSignal,
  ) => Promise<{ version: string }>)[];
}

const setupEvents: EventName[] = [
  "extensions:@workspace-extensions/local-models::models.changed",
  "extensions:@workspace-extensions/browser-data::import-job-changed",
  "extensions:status",
  "apps:status",
  "workspace:config-changed",
  "hub:workspace-catalog-changed",
  "server-connection-changed",
  "website:connection-changed",
  "remote-transport-diagnostics-changed",
  "shell-approval:resolved",
];

function dependencies(): SetupObservationDependencies {
  const observeService = (
    protocol: string,
    method: import("@vibestudio/rpc").RpcMethod<
      [{ afterVersion?: string }],
      { version: string }
    >,
  ) => {
    const service = createDurableObjectServiceClient(rpc, protocol, {
      observeChanges: method,
    });
    return (afterVersion: string | undefined, signal: AbortSignal) =>
      service.callWithOptions("observeChanges", [{ afterVersion }], { signal });
  };
  return {
    watch: async (signal) =>
      readEventWatchRecords(
        await EventsClient.openWatch(rpc, setupEvents, crypto.randomUUID(), {
          signal,
        }),
      ),
    owners: [
      (afterVersion, signal) =>
        rpc.call(
          "main",
          mainRpcMethods["credentials.observeChanges"],
          [{ afterVersion }],
          {
            signal,
          },
        ),
      observeService(
        "vibestudio.models.v1",
        modelSettingsRpcMethods.observeChanges,
      ),
      observeService(
        "vibestudio.missions.v1",
        missionsRpcMethods.observeChanges,
      ),
      (afterVersion, signal) =>
        rpc.call(
          "main",
          mainRpcMethods["hubControl.observeDevices"],
          [{ afterVersion }],
          {
            signal,
          },
        ),
    ],
  };
}

export function openSetupObservation(
  onChanged: () => void,
  sources: SetupObservationDependencies = dependencies(),
) {
  const controller = new AbortController();
  const taskFailures: Array<{ error: unknown; ownerCancelled: boolean }> = [];
  const own = <T>(run: () => Promise<T>): Promise<T> =>
    run().catch((error: unknown) => {
      taskFailures.push({
        error,
        ownerCancelled:
          controller.signal.aborted &&
          isRpcAbortedBy(error, controller.signal.reason),
      });
      throw error;
    });
  let resolveReady!: () => void;
  let rejectReady!: (error: unknown) => void;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  let remaining = sources.owners.length + 1;
  const admitted = () => {
    if (--remaining === 0) resolveReady();
  };
  const changed = () => {
    if (remaining === 0 && !controller.signal.aborted) onChanged();
  };
  const tasks = sources.owners.map((observe) =>
    own(async () => {
      let current = await observe(undefined, controller.signal);
      admitted();
      while (!controller.signal.aborted) {
        current = await observe(current.version, controller.signal);
        changed();
      }
    }),
  );
  tasks.push(
    own(async () => {
      const records = await sources.watch(controller.signal);
      let acknowledged = false;
      for await (const record of records) {
        if (record.kind === "watching") {
          if (acknowledged)
            throw new Error("Setup owner watch repeated admission");
          acknowledged = true;
          admitted();
        } else {
          if (!acknowledged)
            throw new Error(
              "Setup owner watch sent an update before admission",
            );
          changed();
        }
      }
      if (!controller.signal.aborted)
        throw new Error("Setup owner watch closed");
    }),
  );
  const completion: Promise<void> = Promise.all(tasks)
    .catch(async (error: unknown) => {
      rejectReady(error);
      controller.abort(error);
      await Promise.allSettled(tasks);
      const failures = taskFailures
        .filter((failure) => !failure.ownerCancelled)
        .map((failure) => failure.error);
      if (failures.length === 1) throw failures[0];
      if (failures.length > 1) {
        throw new AggregateError(failures, "Setup observation failed", {
          cause: failures[0],
        });
      }
    })
    .then(() => undefined);
  // The caller owns both admission and completion. Hold a rejection handler
  // until its effect can attach them, without swallowing either returned error.
  void ready.catch(() => {});
  void completion.catch(() => {});
  return {
    ready,
    completion,
    async close() {
      const reason = new Error("SetupHub observation closed");
      rejectReady(
        controller.signal.aborted ? controller.signal.reason : reason,
      );
      controller.abort(reason);
      await completion;
    },
  };
}
