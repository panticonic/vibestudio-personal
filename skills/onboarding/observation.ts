import { createDurableObjectServiceClient } from "@vibestudio/service-schemas/clients/durableObjectServiceClient";
import { missionsRpcMethods } from "@vibestudio/service-schemas/missions";
import { modelSettingsRpcMethods } from "@workspace/model-catalog/rpc-contract";
import { mainRpcMethods } from "@vibestudio/service-schemas/mainRpc";
import { EventsClient } from "@vibestudio/service-schemas/clients/eventsClient";
import {
  readEventWatchRecords,
  type EventName,
} from "@vibestudio/shared/events";
import { isRpcAbortedBy, type RpcConnectionStatus } from "@vibestudio/rpc";
import { rpc } from "@workspace/runtime";

export interface SetupObservationDependencies {
  watch(signal: AbortSignal): Promise<AsyncIterable<{ kind: string }>>;
  owners: readonly ((
    afterVersion: string | undefined,
    signal: AbortSignal,
  ) => Promise<{ version: string }>)[];
  connection: {
    status(): RpcConnectionStatus;
    onStatusChange(handler: (status: RpcConnectionStatus) => void): () => void;
  };
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
    connection: {
      status: () => rpc.status(),
      onStatusChange: (handler) => rpc.onStatusChange(handler),
    },
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
  let resolveReady!: () => void;
  let rejectReady!: (error: unknown) => void;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  let resolveCompletion!: () => void;
  let rejectCompletion!: (error: unknown) => void;
  const completion = new Promise<void>((resolve, reject) => {
    resolveCompletion = resolve;
    rejectCompletion = reject;
  });
  let admittedOnce = false;
  let closed = false;
  let settled = false;
  let desiredStatus: RpcConnectionStatus = "connecting";

  interface Generation {
    controller: AbortController;
    ready: Promise<void>;
    completion: Promise<void>;
    retiredByConnection: boolean;
  }

  const openGeneration = (): Generation => {
    const controller = new AbortController();
    const taskFailures: Array<{ error: unknown; ownerCancelled: boolean }> = [];
    let resolveGenerationReady!: () => void;
    let rejectGenerationReady!: (error: unknown) => void;
    const generationReady = new Promise<void>((resolve, reject) => {
      resolveGenerationReady = resolve;
      rejectGenerationReady = reject;
    });
    const own = <T>(run: () => Promise<T>): Promise<T> =>
      run().catch((error: unknown) => {
        taskFailures.push({
          error,
          ownerCancelled:
            controller.signal.aborted &&
            isRpcAbortedBy(error, controller.signal.reason),
        });
        rejectGenerationReady(error);
        throw error;
      });
    let remaining = sources.owners.length + 1;
    const admitted = () => {
      if (--remaining === 0) resolveGenerationReady();
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
    const generation: Generation = {
      controller,
      ready: generationReady,
      retiredByConnection: false,
      completion: Promise.resolve(),
    };
    generation.completion = Promise.all(tasks)
      .catch(async (error: unknown) => {
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
    return generation;
  };

  let current: Generation | undefined;
  let reconcileChain = Promise.resolve();
  const fail = (error: unknown) => {
    if (settled) return;
    settled = true;
    rejectReady(error);
    rejectCompletion(error);
    unsubscribeStatus();
  };
  const reconcile = async () => {
    if (current && (closed || desiredStatus !== "connected")) {
      const retiring = current;
      current = undefined;
      const reason = new Error(
        closed
          ? "SetupHub observation closed"
          : "Setup observation transport generation retired",
      );
      retiring.controller.abort(reason);
      try {
        await retiring.completion;
      } catch (error) {
        if (!retiring.retiredByConnection) throw error;
      }
    }
    if (closed) {
      if (!settled) {
        settled = true;
        rejectReady(new Error("SetupHub observation closed"));
        resolveCompletion();
      }
      return;
    }
    if (desiredStatus !== "connected" || current) return;
    const generation = openGeneration();
    current = generation;
    void generation.ready
      .then(() => {
        if (current !== generation || generation.controller.signal.aborted)
          return;
        if (!admittedOnce) {
          admittedOnce = true;
          resolveReady();
        } else {
          onChanged();
        }
      })
      .catch((error: unknown) => {
        if (!admittedOnce && !generation.retiredByConnection)
          rejectReady(error);
      });
    void generation.completion
      .then(() => {
        if (current === generation && !generation.controller.signal.aborted)
          scheduleReconcile(
            new Error("Setup observation generation closed unexpectedly"),
          );
      })
      .catch((error: unknown) => {
        if (generation.retiredByConnection) return;
        fail(error);
      });
  };
  const scheduleReconcile = (failure?: unknown) => {
    if (failure !== undefined) {
      fail(failure);
      return;
    }
    reconcileChain = reconcileChain.then(reconcile).catch(fail);
  };
  const unsubscribeStatus = sources.connection.onStatusChange((status) => {
    desiredStatus = status;
    if (status !== "connected" && current) {
      current.retiredByConnection = true;
      current.controller.abort(
        new Error("Setup observation transport generation retired"),
      );
    }
    scheduleReconcile();
  });
  desiredStatus = sources.connection.status();
  scheduleReconcile();

  // The caller owns both admission and completion. Hold a rejection handler
  // until its effect can attach them, without swallowing either returned error.
  void ready.catch(() => {});
  void completion.catch(() => {});
  return {
    ready,
    completion,
    async close() {
      if (!closed) {
        closed = true;
        unsubscribeStatus();
        scheduleReconcile();
      }
      await reconcileChain;
      await completion;
    },
  };
}
