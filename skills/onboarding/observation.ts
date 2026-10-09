import { EventsClient } from "@vibestudio/service-schemas/clients/eventsClient";
import {
  readEventWatchRecords,
  type EventName,
} from "@vibestudio/shared/events";
import { isRpcAborted } from "@vibestudio/rpc";
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
  const observeService = (protocol: string) => {
    let target: Promise<string> | undefined;
    return async (afterVersion: string | undefined, signal: AbortSignal) => {
      target ??= rpc
        .call<{
          kind: string;
          targetId: string;
        }>("main", "workers.resolveService", [{ protocol }], { signal })
        .then((resolved) => {
          if (resolved.kind !== "durable-object")
            throw new Error(`${protocol} has no durable setup owner`);
          return resolved.targetId;
        });
      return rpc.call<{ version: string }>(
        await target,
        "observeChanges",
        [{ afterVersion }],
        { signal },
      );
    };
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
        rpc.call("main", "credentials.observeChanges", [{ afterVersion }], {
          signal,
        }),
      observeService("vibestudio.models.v1"),
      observeService("vibestudio.missions.v1"),
      (afterVersion, signal) =>
        rpc.call("main", "hubControl.observeDevices", [{ afterVersion }], {
          signal,
        }),
    ],
  };
}

/** All subscriptions are admitted before the caller's first snapshot. Each
 * versioned owner rechecks its revision when the next observation is admitted. */
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
          (isRpcAborted(error) || error === controller.signal.reason),
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
  let originalFailure: { error: unknown } | undefined;
  const joinedFailures = (primary?: { error: unknown }) =>
    taskFailures
      .filter(
        (failure) =>
          !failure.ownerCancelled &&
          (!primary || failure.error !== primary.error),
      )
      .map((failure) => failure.error);
  const completion: Promise<void> = Promise.all(tasks)
    .catch(async (error: unknown) => {
      originalFailure = { error };
      rejectReady(error);
      controller.abort(error);
      await Promise.allSettled(tasks);
      const failures = joinedFailures(originalFailure);
      if (failures.length > 0) {
        throw new AggregateError(
          [error, ...failures],
          "Setup owner observation failed and a sibling failed while closing.",
          { cause: error },
        );
      }
      throw error;
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
      await Promise.allSettled(tasks);
      const failures = joinedFailures(originalFailure);
      if (failures.length === 1) throw failures[0];
      if (failures.length > 1)
        throw new AggregateError(
          failures,
          "Setup owner observers failed while closing.",
        );
    },
  };
}
