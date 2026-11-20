import { rpc } from "@workspace/runtime/worker/kernel";
import { BrowserDataDO } from "@workspace-workers/browser-data";
import type { ImportJobWrite } from "@vibestudio/browser-data";

export class BrowserImportFixtureStore extends BrowserDataDO {
  @rpc({
    website: { kind: "closed", reason: "Owned synthetic import receipts." },
    principals: ["code"],
    effect: { kind: "open" },
    tier: "open",
    sensitivity: "write",
  })
  seedImportReceipt(receipt: ImportJobWrite) {
    this.requireFixtureKey(receipt.jobId);
    this.upsertImportJob(receipt);
  }

  @rpc({
    website: { kind: "closed", reason: "Owned synthetic import receipts." },
    principals: ["code"],
    effect: { kind: "open" },
    tier: "open",
    sensitivity: "read",
  })
  readImportReceipt(receiptId: string) {
    this.requireFixtureKey(receiptId);
    return this.getImportJob(receiptId);
  }

  private requireFixtureKey(receiptId: string) {
    if (
      receiptId !== this.objectKey ||
      !receiptId.startsWith("browser-import-fixture-")
    )
      throw new Error("Import receipt does not belong to this fixture");
  }
}
