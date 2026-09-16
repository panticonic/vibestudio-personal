import { DurableObjectBase, rpc } from "@workspace/runtime/worker/kernel";

/** A read-only resource for learning the real authority flow. No personal data. */
export class TourSample extends DurableObjectBase {
  static override schemaVersion = 1;

  protected createTables(): void {
    // The sample is constant; there is no user data or persistent state.
  }

  @rpc({
    website: {
      kind: "closed",
      reason: "This sample belongs to the workspace tour.",
    },
    principals: ["code"],
    effect: {
      kind: "userland-capability",
      capability: "sample.read",
      resource: { kind: "receiver-object" },
    },
    tier: "gated",
    sensitivity: "read",
  })
  read(): { title: string; minutes: number } {
    return { title: "A windowsill garden", minutes: 6 };
  }
}
