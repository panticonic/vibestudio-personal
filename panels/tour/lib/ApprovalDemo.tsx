import { useEffect, useRef, useState } from "react";
import { rpc, workers } from "@workspace/runtime";

export function ApprovalDemo() {
  const [state, setState] = useState<"idle" | "pending" | "success" | "error">(
    "idle",
  );
  const [sample, setSample] = useState<{ title: string; minutes: number }>();
  const [error, setError] = useState("");
  const pending = useRef<AbortController | null>(null);

  useEffect(() => () => pending.current?.abort(), []);

  async function readSample() {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setState("pending");
    setError("");
    try {
      const service = await workers.resolveService(
        "vibestudio.tour-sample.v1",
        "sample",
      );
      if (controller.signal.aborted) return;
      if (service.kind !== "durable-object")
        throw new Error("The tour sample requires a Durable Object service.");
      // Every click reaches the same protected receiver. Local UI state never grants access.
      const result = await rpc.call<{ title: string; minutes: number }>(
        service.targetId,
        "read",
        [],
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      setSample(result);
      setState("success");
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(cause instanceof Error ? cause.message : String(cause));
      setState("error");
    } finally {
      if (pending.current === controller) pending.current = null;
    }
  }

  return (
    <div className="approval-demo">
      <p>
        Try it: read a fictional reading-list item. No personal data or external
        services.
      </p>
      <button
        type="button"
        className="btn"
        disabled={state === "pending"}
        onClick={readSample}
      >
        {state === "pending"
          ? "Waiting for access…"
          : sample
            ? "Try the same request again"
            : "Read the tour sample"}
      </button>
      <div role="status" aria-live="polite">
        {state === "success" && sample && (
          <p>
            Read successfully: “{sample.title}” · {sample.minutes} min.
          </p>
        )}
        {state === "pending" && (
          <p>
            Complete any approval in Vibestudio’s permission prompt. You can
            allow or deny.
          </p>
        )}
        {state === "error" && <p>Request did not complete: {error}</p>}
      </div>
      <p className="box__sub">
        Allow this code version to try reuse, or allow once to be asked again.
        No prompt? You may have approved access when adding the tour. Every
        click is checked by the host.
      </p>
    </div>
  );
}
