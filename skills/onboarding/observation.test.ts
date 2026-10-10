import { durableObjectServiceFixture } from "@vibestudio/service-schemas/test-utils";
import { formatRpcFailure, rpcCallerAbortedError } from "@vibestudio/rpc";
import { expect, it, vi } from "vitest";
const transport = vi.hoisted(() => ({ call: vi.fn(), stream: vi.fn() }));
vi.mock("@workspace/runtime", async () => ({
  rpc: (await import("@vibestudio/rpc/internal")).schemaRpcCaller(transport),
}));
import { openSetupObservation } from "./observation";

function owner() {
  let version = "initial";
  let waiting: (() => void) | undefined;
  let live = 0;
  return {
    get live() {
      return live;
    },
    change() {
      version += "-changed";
      waiting?.();
    },
    observe: async (afterVersion: string | undefined, signal: AbortSignal) => {
      signal.throwIfAborted();
      if (version !== afterVersion) return { version };
      return new Promise<{ version: string }>((resolve, reject) => {
        live++;
        const cleanup = () => {
          live--;
          waiting = undefined;
          signal.removeEventListener("abort", aborted);
        };
        const aborted = () => {
          cleanup();
          reject(signal.reason);
        };
        waiting = () => {
          cleanup();
          resolve({ version });
        };
        signal.addEventListener("abort", aborted, { once: true });
      });
    },
  };
}

it("admits the real setup dependencies using positional service queries and closes every subscription", async () => {
  const owners = new Map<string, ReturnType<typeof owner>>();
  let watchClosed = false;
  transport.call.mockImplementation(
    async (target, method, args, { signal }) => {
      if (method === "workers.resolveService") {
        if (typeof args[0] !== "string")
          throw new Error("workers.resolveService query must be a string");
        return durableObjectServiceFixture(`do:${args[0]}`, {
          source: "workers/setup",
          name: "setup",
          className: "SetupDO",
          objectKey: "workspace",
          action: "setup",
          presentation: { domain: "automation", verb: "act" },
          authority: { principals: ["code"], binding: "declared" },
          origin: "workspace",
          protocols: [args[0]],
        });
      }
      const key = `${target}:${method}`;
      let source = owners.get(key);
      if (!source) {
        source = owner();
        owners.set(key, source);
      }
      return source.observe(args[0].afterVersion, signal);
    },
  );
  transport.stream.mockImplementation(
    async (_target, _method, _args, { signal }) => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{"kind":"watching"}\n'));
          signal.addEventListener(
            "abort",
            () => {
              watchClosed = true;
              controller.error(signal.reason);
            },
            { once: true },
          );
        },
      });
      return { status: 200, body };
    },
  );
  const changed = vi.fn();
  const observation = openSetupObservation(changed);
  try {
    await observation.ready;
    expect(owners.size).toBe(4);
    const resolutions = transport.call.mock.calls.filter(
      (call) => call[1] === "workers.resolveService",
    );
    expect(resolutions.map((call) => call[2])).toEqual([
      ["vibestudio.models.v1", null],
      ["vibestudio.missions.v1", null],
    ]);
    owners.get("do:vibestudio.models.v1:observeChanges")!.change();
    await vi.waitFor(() => expect(changed).toHaveBeenCalledTimes(1));
    expect(
      transport.call.mock.calls.filter(
        (call) => call[1] === "workers.resolveService",
      ),
    ).toHaveLength(2);
  } finally {
    await observation.close();
  }
  await expect(observation.completion).resolves.toBeUndefined();
  expect([...owners.values()].map((source) => source.live)).toEqual([
    0, 0, 0, 0,
  ]);
  expect(watchClosed).toBe(true);
});

it("reports every independent failure in the combined error while preserving the original errors", async () => {
  const primary = new Error("model service resolution failed");
  const secondary = new AggregateError(
    [
      new Error("mission service resolution failed"),
      new Error("mission owner disconnected"),
    ],
    "Mission subscription failed",
  );
  const observation = openSetupObservation(vi.fn(), {
    owners: [
      async () => {
        throw primary;
      },
      async () => {
        throw secondary;
      },
    ],
    watch: async (signal) =>
      (async function* () {
        yield { kind: "watching" };
        await new Promise<void>((_resolve, reject) => {
          const aborted = () => reject(signal.reason);
          signal.addEventListener("abort", aborted, { once: true });
          if (signal.aborted) aborted();
        });
      })(),
  });
  await expect(observation.ready).rejects.toBe(primary);
  const failure = await observation.completion.catch((error: unknown) => error);
  expect(failure).toBeInstanceOf(AggregateError);
  expect((failure as AggregateError).errors).toEqual([primary, secondary]);
  expect((failure as AggregateError).cause).toBe(primary);
  expect(formatRpcFailure(failure)).toContain(primary.message);
  expect(formatRpcFailure(failure)).toContain(
    "mission service resolution failed",
  );
  expect(formatRpcFailure(failure)).toContain("mission owner disconnected");
  await expect(observation.close()).rejects.toBe(failure);
});

it("includes each cleanup failure in the combined close error", async () => {
  const failures = [
    new Error("model release failed"),
    new Error("mission release failed"),
  ];
  const observation = openSetupObservation(vi.fn(), {
    owners: failures.map((failure) => async (afterVersion, signal) => {
      if (afterVersion === undefined) return { version: "initial" };
      return new Promise<{ version: string }>((_resolve, reject) => {
        const aborted = () => reject(failure);
        signal.addEventListener("abort", aborted, { once: true });
        if (signal.aborted) aborted();
      });
    }),
    watch: async (signal) =>
      (async function* () {
        yield { kind: "watching" };
        await new Promise<void>((_resolve, reject) => {
          const aborted = () => reject(signal.reason);
          signal.addEventListener("abort", aborted, { once: true });
          if (signal.aborted) aborted();
        });
      })(),
  });
  await observation.ready;
  const failure = await observation.close().catch((error: unknown) => error);
  expect(failure).toBeInstanceOf(AggregateError);
  expect((failure as AggregateError).errors).toEqual(failures);
  expect((failure as AggregateError).cause).toBe(failures[0]);
  await expect(observation.completion).rejects.toBe(failure);
  expect(formatRpcFailure(failure)).toContain(failures[0]!.message);
  expect(formatRpcFailure(failure)).toContain(failures[1]!.message);
});

it("admits every owner before readiness and joins cancellation of all observations", async () => {
  const owners = [owner(), owner(), owner(), owner()];
  let admit!: () => void;
  const admission = new Promise<void>((resolve) => {
    admit = resolve;
  });
  let streamClosed = false;
  let observeChange!: () => void;
  const changeSeen = new Promise<void>((resolve) => {
    observeChange = resolve;
  });
  const changed = vi.fn(observeChange);
  const observation = openSetupObservation(changed, {
    owners: owners.map((source) => source.observe),
    watch: async (signal) =>
      (async function* () {
        await admission;
        yield { kind: "watching" };
        try {
          await new Promise<void>((_resolve, reject) => {
            const aborted = () => reject(signal.reason);
            signal.addEventListener("abort", aborted, { once: true });
            if (signal.aborted) aborted();
          });
        } finally {
          streamClosed = true;
        }
      })(),
  });
  let ready = false;
  void observation.ready.then(() => {
    ready = true;
  });
  await Promise.resolve();
  owners[0]!.change();
  expect(ready).toBe(false);
  expect(changed).not.toHaveBeenCalled();
  admit();
  await observation.ready;
  owners[1]!.change();
  await changeSeen;
  expect(changed).toHaveBeenCalledTimes(1);
  await observation.close();
  expect(owners.map((source) => source.live)).toEqual([0, 0, 0, 0]);
  expect(streamClosed).toBe(true);
});

it("propagates the original owner failure and retires the other observations", async () => {
  const other = owner();
  const failure = new Error("model owner disconnected");
  const observation = openSetupObservation(vi.fn(), {
    owners: [
      other.observe,
      async () => {
        throw failure;
      },
    ],
    watch: async (signal) =>
      (async function* () {
        yield { kind: "watching" };
        await new Promise<void>((_resolve, reject) => {
          const aborted = () => reject(signal.reason);
          signal.addEventListener("abort", aborted, { once: true });
          if (signal.aborted) aborted();
        });
      })(),
  });
  await expect(observation.ready).rejects.toBe(failure);
  await expect(observation.completion).rejects.toBe(failure);
  expect(other.live).toBe(0);
});

it("propagates an owner cancellation that happened before aggregate cancellation", async () => {
  const independent = Object.assign(
    new Error("credential observation disconnected"),
    {
      code: "RPC_ABORTED",
    },
  );
  const observation = openSetupObservation(vi.fn(), {
    owners: [
      async () => {
        throw independent;
      },
      async (_version, signal) => {
        await new Promise<void>((_resolve, reject) => {
          const aborted = () => reject(signal.reason);
          signal.addEventListener("abort", aborted, { once: true });
          if (signal.aborted) aborted();
        });
        return { version: "unreachable" };
      },
    ],
    watch: async (signal) =>
      (async function* () {
        yield { kind: "watching" };
        await new Promise<void>((_resolve, reject) => {
          const aborted = () => reject(signal.reason);
          signal.addEventListener("abort", aborted, { once: true });
          if (signal.aborted) aborted();
        });
      })(),
  });

  await expect(observation.ready).rejects.toBe(independent);
  await expect(observation.completion).rejects.toBe(independent);
});

it.each([false, true])(
  "keeps independent cancellation distinct from sibling teardown (%s)",
  async (independent) => {
    const primary = new Error("device observer failed");
    const unrelated = rpcCallerAbortedError(
      new Error("another operation closed"),
    );
    const waitForAbort = (signal: AbortSignal) =>
      new Promise<never>((_resolve, reject) => {
        const aborted = () =>
          reject(
            independent ? unrelated : rpcCallerAbortedError(signal.reason),
          );
        signal.addEventListener("abort", aborted, { once: true });
        if (signal.aborted) aborted();
      });
    const observation = openSetupObservation(vi.fn(), {
      owners: [
        async () => {
          throw primary;
        },
        async (_version, signal) => waitForAbort(signal),
      ],
      watch: async (signal) =>
        (async function* () {
          yield { kind: "watching" };
          await new Promise<never>((_resolve, reject) => {
            const aborted = () => reject(rpcCallerAbortedError(signal.reason));
            signal.addEventListener("abort", aborted, { once: true });
            if (signal.aborted) aborted();
          });
        })(),
    });
    await expect(observation.ready).rejects.toBe(primary);
    const failure = await observation.completion.catch((error) => error);
    if (independent) expect(failure.errors).toEqual([primary, unrelated]);
    else expect(failure).toBe(primary);
    await expect(observation.close()).rejects.toBe(failure);
  },
);
