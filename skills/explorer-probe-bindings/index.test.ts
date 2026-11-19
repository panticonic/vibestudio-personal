import { expect, it, vi } from "vitest";
import { bindExplorerTextProbe } from "./index.js";

const ports = vi.hoisted(() => ({
  call: vi.fn(),
  mkdtemp: vi.fn(async () => "/.tmp/probe"),
  writeFile: vi.fn(),
  rm: vi.fn(),
  exists: vi.fn(async () => false),
}));
vi.mock("@workspace/runtime", () => ({
  contextId: "assigned-context", fs: ports, rpc: { call: ports.call },
}));

it("requires an exact plan and retires its scratch directory on a native failure", async () => {
  const { request, services } = bindExplorerTextProbe({
    goal: "Check exact readback", text: "Résumé\r\n", claim: null, repeat: false,
  });
  const probe = services.explorerTextProbe;
  const id = request.operationId;
  const input = await probe.input(id);
  const plan = {
    expectedBytes: input.bytes,
    expectedDigest: input.digest,
    check: "exact-content",
    comparison: "round-trip",
  } as const;
  await expect(probe.run("foreign", plan)).rejects.toThrow("assigned");
  await expect(probe.run(id, { ...plan, expectedBytes: input.characters })).rejects.toThrow("assigned bytes");
  expect(ports.mkdtemp).not.toHaveBeenCalled();
  const failure = new Error("Native file read failed");
  ports.call.mockRejectedValueOnce(failure);
  await expect(probe.run(id, plan)).rejects.toBe(failure);
  expect(ports.writeFile).toHaveBeenCalledWith("/.tmp/probe/source.txt", "Résumé\r\n");
  expect(ports.rm).toHaveBeenCalledExactlyOnceWith("/.tmp/probe", { recursive: true, force: true });
});

it("preserves both the experiment and cleanup failure", async () => {
  const { request, services } = bindExplorerTextProbe({
    goal: "Check exact readback", text: "queued\n", claim: null, repeat: false,
  });
  const probe = services.explorerTextProbe;
  const id = request.operationId;
  const input = await probe.input(id);
  const nativeFailure = new Error("The file write failed");
  const cleanupFailure = new Error("Scratch cleanup failed");
  ports.writeFile.mockRejectedValueOnce(nativeFailure);
  ports.rm.mockRejectedValueOnce(cleanupFailure);
  await expect(probe.run(id, {
    expectedBytes: input.bytes,
    expectedDigest: input.digest,
    check: "exact-content",
    comparison: "round-trip",
  })).rejects.toMatchObject({ name: "AggregateError", errors: [nativeFailure, cleanupFailure] });
});
