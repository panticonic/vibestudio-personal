// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApprovalDemo } from "./ApprovalDemo";

const host = vi.hoisted(() => ({ resolve: vi.fn(), call: vi.fn() }));
vi.mock("@workspace/runtime", () => ({
  workers: { resolveService: host.resolve },
  rpc: { call: host.call },
}));

describe("ApprovalDemo", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    host.resolve
      .mockReset()
      .mockResolvedValue({ kind: "durable-object", targetId: "do:sample" });
    host.call
      .mockReset()
      .mockResolvedValue({ title: "A windowsill garden", minutes: 6 });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root.render(<ApprovalDemo />));
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });
  const click = async (container: HTMLElement) =>
    act(async () => container.querySelector("button")!.click());

  it("does nothing until clicked and sends every repeat through the protected receiver", async () => {
    expect(host.call).not.toHaveBeenCalled();
    await click(container);
    expect(container.textContent).toContain("Read successfully");
    expect(container.querySelector("button")!.textContent).toBe(
      "Try the same request again",
    );
    await click(container);
    expect(host.resolve).toHaveBeenNthCalledWith(
      2,
      "vibestudio.tour-sample.v1",
      "sample",
    );
    expect(host.call).toHaveBeenCalledTimes(2);
    for (const call of host.call.mock.calls) {
      expect(call.slice(0, 3)).toEqual(["do:sample", "read", []]);
      expect(call[3].signal).toBeInstanceOf(AbortSignal);
    }
  });

  it("does not claim success or retry automatically after denial", async () => {
    host.call.mockRejectedValue(new Error("Permission denied"));
    await click(container);
    expect(container.textContent).toContain("Permission denied");
    expect(container.textContent).not.toContain("Read successfully");
    expect(host.call).toHaveBeenCalledTimes(1);
    expect(container.querySelector("button")!.disabled).toBe(false);
  });

  it("prevents duplicate requests while approval is pending and aborts on unmount", async () => {
    host.call.mockImplementation(() => new Promise(() => {}));
    await click(container);
    expect(container.querySelector("button")!.disabled).toBe(true);
    await click(container);
    expect(host.call).toHaveBeenCalledTimes(1);
    const signal = host.call.mock.calls[0]![3].signal;
    await act(async () => root.render(null));
    expect(signal.aborted).toBe(true);
  });
});
