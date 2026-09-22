import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "@workspace/test-runtime";
import { ApprovalDemo } from "./ApprovalDemo";

describe("ApprovalDemo", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  const click = async (target: HTMLElement) =>
    act(async () => target.querySelector("button")!.click());

  async function render(
    overrides: {
      resolveService?: (...args: unknown[]) => unknown;
      callService?: (...args: unknown[]) => unknown;
    } = {},
  ) {
    const resolveService = vi.fn(
      overrides.resolveService ??
        (() =>
          Promise.resolve({ kind: "durable-object", targetId: "do:sample" })),
    );
    const callService = vi.fn(
      overrides.callService ??
        (() => Promise.resolve({ title: "A windowsill garden", minutes: 6 })),
    );
    await act(async () => {
      root.render(
        <ApprovalDemo
          resolveService={resolveService as never}
          callService={callService as never}
        />,
      );
    });
    return { resolveService, callService };
  }

  it("does nothing until clicked and sends every repeat through the protected receiver", async () => {
    const host = await render();
    expect(host.callService).toHaveBeenCalledTimes(0);
    await click(container);
    expect(container.textContent).toContain("Read successfully");
    expect(container.querySelector("button")!.textContent).toBe(
      "Try the same request again",
    );
    await click(container);
    expect(host.resolveService).toHaveBeenCalledTimes(2);
    expect(host.callService).toHaveBeenCalledTimes(2);
    for (const call of host.callService.mock.calls) {
      expect(call.slice(0, 3)).toEqual(["do:sample", "read", []]);
      expect(call[3]).toBeDefined();
      expect((call[3] as { signal: AbortSignal }).signal.aborted).toBe(false);
    }
  });

  it("does not claim success or retry automatically after denial", async () => {
    const host = await render({
      callService: () => Promise.reject(new Error("Permission denied")),
    });
    await click(container);
    expect(container.textContent).toContain("Permission denied");
    expect(container.textContent).not.toContain("Read successfully");
    expect(host.callService).toHaveBeenCalledTimes(1);
    expect(container.querySelector("button")!.disabled).toBe(false);
  });

  it("prevents duplicate requests while approval is pending and aborts on unmount", async () => {
    const host = await render({
      callService: () => new Promise(() => undefined),
    });
    await click(container);
    expect(container.querySelector("button")!.disabled).toBe(true);
    await click(container);
    expect(host.callService).toHaveBeenCalledTimes(1);
    const signal = (
      host.callService.mock.calls[0]![3] as { signal: AbortSignal }
    ).signal;
    await act(async () => root.render(null));
    expect(signal.aborted).toBe(true);
  });
});
