import { rpc } from "@workspace/runtime/worker/kernel";
import { BrowserDataDO } from "@workspace-workers/browser-data";
import type {
  ImportedBookmark,
  ImportJobWrite,
} from "@vibestudio/browser-data";

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

  @rpc({
    website: { kind: "closed", reason: "Owned synthetic import batches." },
    principals: ["code"],
    effect: { kind: "open" },
    tier: "open",
    sensitivity: "write",
  })
  async storeFixtureBookmarks(
    receiptId: string,
    batchIndex: number,
    bookmarks: ImportedBookmark[],
    sourceId: string,
  ) {
    this.requireFixtureKey(receiptId);
    await this.addBookmarksBatch(bookmarks, { sourceId });
    return this.recordImportBatch({
      jobId: receiptId,
      dataType: "bookmarks",
      batchIndex,
      idempotencyKey: `${receiptId}:bookmarks:${batchIndex}`,
      itemCount: bookmarks.length,
    });
  }

  @rpc({
    website: { kind: "closed", reason: "Owned synthetic import batches." },
    principals: ["code"],
    effect: { kind: "open" },
    tier: "open",
    sensitivity: "read",
  })
  async readFixtureBookmarks(receiptId: string) {
    this.requireFixtureKey(receiptId);
    const rows = await this.getBookmarks("/Migration");
    return rows.map(({ title, url }) => ({ title, url }));
  }

  private requireFixtureKey(receiptId: string) {
    if (
      receiptId !== this.objectKey ||
      !receiptId.startsWith("browser-import-fixture-")
    )
      throw new Error("Import receipt does not belong to this fixture");
  }
}
