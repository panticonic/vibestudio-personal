import { sha256Hex, sha256HexSyncText } from "@vibestudio/content-addressing";
import { mainRpcMethods } from "@vibestudio/service-schemas/mainRpc";
import { contextId, fs, rpc } from "@workspace/runtime";
import type {
  TextProbeInput,
  TextProbePlan,
  TextProbeReceipt,
} from "../explorer-probe/types.js";

type Assignment = {
  goal: string;
  text: string;
  claim: TextProbeInput["claim"];
  repeat: boolean;
};
const maxBytes = 4 * 1024;

export function bindExplorerTextProbe({ goal, text, claim, repeat }: Assignment) {
  const inputBytes = new TextEncoder().encode(text);
  if (!contextId || !goal.trim() || inputBytes.length > maxBytes)
    throw new Error("Assign a bounded text probe in the active workspace context");
  const hasCrlf = text.includes("\r\n");
  const hasLf = /(?<!\r)\n/u.test(text);
  const input: TextProbeInput = {
    bytes: inputBytes.length,
    characters: Array.from(text).length,
    digest: sha256Hex(inputBytes),
    lineEnding: hasCrlf ? hasLf ? "mixed" : "crlf" : hasLf ? "lf" : "none",
    claim,
    repeat,
  };
  const request = { goal, operationId: crypto.randomUUID() };
  let read = false;
  let pending: Promise<TextProbeReceipt> | undefined;

  async function exercise(): Promise<TextProbeReceipt> {
    const directory = await fs.mkdtemp("explorer-text-probe");
    let blob: TextProbeReceipt["blob"];
    let file: Omit<TextProbeReceipt["file"], "removed">;
    let failure: { error: unknown } | undefined;
    try {
      const path = `${directory}/source.txt`;
      await fs.writeFile(path, text);
      const result = await rpc.call("main", mainRpcMethods["fs.readBytes"], [
        path, { offset: 0, limit: maxBytes },
      ]);
      const bytes = Uint8Array.from(atob(result.base64), (character) => character.charCodeAt(0));
      if (result.truncated || result.start !== 0 || result.end !== result.totalBytes ||
        result.totalBytes !== bytes.length)
        throw new Error("The native file read did not cover the complete assigned text");
      file = { digest: sha256Hex(bytes), bytes: bytes.length };

      const put = () => rpc.call("main", mainRpcMethods["blobstore.putText"], [text]);
      const written = await put();
      const [exists, stat, readback] = await Promise.all([
        rpc.call("main", mainRpcMethods["blobstore.has"], [input.digest]),
        rpc.call("main", mainRpcMethods["blobstore.stat"], [input.digest]),
        rpc.call("main", mainRpcMethods["blobstore.getText"], [input.digest]),
      ]);
      blob = {
        digest: written.digest,
        writtenBytes: written.size,
        exists,
        statBytes: stat?.size ?? null,
        readDigest: readback === null ? null : sha256HexSyncText(readback),
        repeatDigest: repeat ? (await put()).digest : null,
      };
    } catch (error) {
      failure = { error };
      throw error;
    } finally {
      try {
        await fs.rm(directory, { recursive: true, force: true });
      } catch (cleanupError) {
        if (failure)
          throw new AggregateError([failure.error, cleanupError], "The text probe and scratch cleanup both failed");
        throw cleanupError;
      }
    }
    return { blob, file: { ...file, removed: !(await fs.exists(directory)) } };
  }

  function requireOperation(id: string) {
    if (id !== request.operationId)
      throw new Error("Use the caller's assigned probe");
  }

  return {
    request,
    services: {
      explorerTextProbe: {
        async input(id: string): Promise<TextProbeInput> {
          requireOperation(id);
          read = true;
          return { ...input };
        },
        async run(id: string, plan: TextProbePlan): Promise<TextProbeReceipt> {
          requireOperation(id);
          if (!read || plan?.expectedBytes !== input.bytes ||
            plan.expectedDigest !== input.digest ||
            plan.comparison !== (repeat ? "repeat-store" : "round-trip"))
            throw new Error("Plan the experiment against the assigned bytes and digest first");
          return structuredClone(await (pending ??= exercise()));
        },
      },
    },
  };
}
