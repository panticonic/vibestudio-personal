import { expect, it, vi } from "vitest";
vi.mock("@workspace/runtime", () => ({ rpc: {} }));
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
