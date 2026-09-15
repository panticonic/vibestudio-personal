import { describe, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import {
  DURABLE_OBJECT_FRAMEWORK_RPC_METHODS,
  type DurableObjectContext,
  type SqlResult,
} from "@vibestudio/durable";
import { rpcExposedMethodNames } from "@vibestudio/rpc";
import { browserProductMethods } from "@vibestudio/service-schemas/browserData";
import { BrowserDataDO } from "./BrowserDataDO.js";

describe("BrowserDataDO schema", () => {
  it("lets the exact reviewed writer finish a user-started background import", () => {
    const manifest = JSON.parse(
      readFileSync(new URL("./package.json", import.meta.url), "utf8"),
    ) as {
      vibestudio: {
        authority: {
          provides: Array<{ name: string; grantScopes: string[] }>;
        };
      };
    };
    const capabilities = Object.fromEntries(
      manifest.vibestudio.authority.provides.map((provided) => [
        provided.name,
        provided.grantScopes,
      ]),
    );

    expect(capabilities["browser-data.write"]).toEqual(["once", "version"]);
    expect(capabilities["browser-data.delete"]).toEqual(["once"]);
  });

  it("has one typed declaration for every exposed data method", () => {
    const db = new DatabaseSync(":memory:");
    const instance = createBrowserDataDO(db);
    const productMethods = [...rpcExposedMethodNames(instance)].filter(
      (method) => !DURABLE_OBJECT_FRAMEWORK_RPC_METHODS.has(method),
    );
    expect(productMethods.sort()).toEqual(
      Object.keys(browserProductMethods).sort(),
    );
  });

  it("creates the one canonical pre-release schema directly", () => {
    const db = new DatabaseSync(":memory:");
    createBrowserDataDO(db);

    expect(
      db.prepare(`SELECT singleton, version FROM _vibestudio_schema`).get(),
    ).toEqual({
      singleton: 1,
      version: 2,
    });
    expect(
      db.prepare(`SELECT 1 FROM state WHERE key = 'schema_version'`).get(),
    ).toBeUndefined();
    expect(
      db
        .prepare(`PRAGMA table_info(page_favicons)`)
        .all()
        .map((column) => column["name"]),
    ).toContain("image_data");
    expect(
      db
        .prepare(`SELECT name FROM sqlite_master WHERE name = 'passwords'`)
        .get(),
    ).toBeUndefined();
    db.close();
  });

  it("enforces tier, sensitivity, and principals from the typed method table", () => {
    const db = new DatabaseSync(":memory:");
    const instance = createBrowserDataDO(db, {
      BROWSER_DATA_BROKER_SOURCE: "extensions/browser-data",
    });
    const resolve = (
      method: keyof typeof browserProductMethods,
    ): import("@vibestudio/rpc").ResolvedRpcAuthority | null =>
      (
        instance as unknown as {
          rpcAuthorityDeclaration(
            name: string,
            schema: (typeof browserProductMethods)[keyof typeof browserProductMethods],
          ): import("@vibestudio/rpc").ResolvedRpcAuthority | null;
        }
      ).rpcAuthorityDeclaration(method, browserProductMethods[method]!);

    expect(resolve("listDownloadRecords")).toMatchObject({
      tier: "open",
      sensitivity: "read",
      effect: { kind: "open" },
    });
    expect(resolve("clearAllHistory")).toMatchObject({
      tier: "gated",
      sensitivity: "destructive",
      effect: {
        kind: "userland-capability",
        capability: "browser-data.delete",
        resource: { kind: "receiver-object" },
      },
    });
    expect(resolve("getHistory")).toMatchObject({
      requires: {
        kind: "any",
        requirements: expect.arrayContaining([
          {
            kind: "all",
            requirements: expect.arrayContaining([
              {
                kind: "relationship",
                name: "code-source",
                value: "extensions/browser-data",
              },
            ]),
          },
        ]),
      },
    });
    db.close();
  });
});

describe("BrowserDataDO canonical history", () => {
  it("preserves aggregate imports without inventing visits, and reimport is idempotent", async () => {
    const db = new DatabaseSync(":memory:");
    const store = createBrowserDataDO(db);
    const entries = [
      {
        url: "https://example.test/old",
        title: "Old favorite",
        visitCount: 120,
        typedCount: 70,
        lastVisitTime: 100,
      },
    ];
    await store.addHistoryBatch(entries, { sourceId: "profile" });
    await store.addHistoryBatch(entries, { sourceId: "profile" });
    expect(
      db.prepare("SELECT count(*) AS n FROM history_visits").get(),
    ).toEqual({ n: 0 });
    store.recordHistoryVisit({
      url: entries[0]!.url,
      visitTime: 200,
      typed: true,
    });
    expect(store.getHistory({ limit: 1 })[0]).toMatchObject({
      visit_count: 121,
      typed_count: 71,
      first_visit: 100,
      last_visit: 200,
    });
    for (let index = 0; index < 65; index++)
      store.recordHistoryVisit({
        url: `https://example.test/recent-${index}`,
        visitTime: 300 + index,
      });
    expect(
      store.searchHistoryForAutocomplete({
        query: "example.test",
        limit: 1,
      })[0],
    ).toMatchObject({ url: entries[0]!.url });
    store.deleteHistoryRange(90, 110);
    expect(store.getHistory({ search: "/old" })[0]).toMatchObject({
      visit_count: 1,
      typed_count: 1,
      first_visit: 200,
    });
  });

  it("uses exact imported visits without counting their profile totals twice", async () => {
    const db = new DatabaseSync(":memory:");
    const store = createBrowserDataDO(db);
    await store.addHistoryBatch(
      [
        {
          url: "https://example.test/",
          title: "Example",
          visitCount: 10,
          typedCount: 4,
          lastVisitTime: 100,
          visits: [{ visitTime: 90, typed: true }, { visitTime: 100 }],
        },
      ],
      { sourceId: "profile" },
    );
    expect(store.getHistory({ limit: 1 })[0]).toMatchObject({
      visit_count: 10,
      typed_count: 4,
      first_visit: 90,
    });
    expect(
      db.prepare("SELECT count(*) AS n FROM history_visits").get(),
    ).toEqual({ n: 2 });
  });
  it("returns an empty history before any native visits or imports", () => {
    const db = new DatabaseSync(":memory:");
    const store = createBrowserDataDO(db);

    expect(store.getHistory({ limit: 10 })).toEqual([]);
    db.close();
  });

  it("combines native and imported visits in one history summary", async () => {
    const db = new DatabaseSync(":memory:");
    const store = createBrowserDataDO(db);
    const url = "https://example.test/docs";

    store.recordHistoryVisit({
      url,
      title: "Native title",
      visitTime: 100,
      transition: "typed",
      typed: true,
      panelId: "panel-1",
    });
    await store.addHistoryBatch(
      [
        {
          url,
          title: "Imported title",
          visitCount: 1,
          lastVisitTime: 200,
        },
      ],
      { sourceId: "chromium-profile" },
    );

    expect(store.getHistory({ limit: 10 })).toEqual([
      expect.objectContaining({
        url,
        title: "Imported title",
        visit_count: 2,
        typed_count: 1,
        first_visit: 100,
        last_visit: 200,
      }),
    ]);
    db.close();
  });
});

describe("BrowserDataDO search providers", () => {
  it("seeds DuckDuckGo, preserves an imported default, and validates selection", async () => {
    const store = createBrowserDataDO(new DatabaseSync(":memory:"));
    expect(
      store.getSearchEngines().find((engine) => engine.is_default)?.name,
    ).toBe("DuckDuckGo");
    await store.addSearchEnginesBatch(
      [
        {
          name: "Custom",
          searchUrl: "https://custom.test/?q=%s",
          isDefault: true,
        },
      ],
      { sourceId: "profile" },
    );
    expect(
      store
        .getSearchEngines()
        .filter((engine) => engine.is_default)
        .map((engine) => engine.name),
    ).toEqual(["Custom"]);
    expect(() => store.setDefaultEngine(9999)).toThrow("no longer exists");
    expect(
      store.getSearchEngines().find((engine) => engine.is_default)?.name,
    ).toBe("Custom");
    expect(() =>
      store.saveSearchEngine({
        name: "Unsafe",
        searchUrl: "javascript:%s",
        isDefault: true,
      }),
    ).toThrow();
  });

  it("fetches encoded OpenSearch completions and keeps addresses local", async () => {
    const store = createBrowserDataDO(new DatabaseSync(":memory:"));
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify([
            "coffee",
            ["coffee beans", "coffee beans", "coffee shop"],
          ]),
        ),
      );
    try {
      expect(await store.getSearchSuggestions("example.com/path")).toEqual([]);
      expect(fetcher).not.toHaveBeenCalled();
      expect(await store.getSearchSuggestions("coffee")).toEqual([
        expect.objectContaining({
          title: "coffee beans",
          source: "search-suggestion",
          url: "https://duckduckgo.com/?q=coffee%20beans",
        }),
        expect.objectContaining({ title: "coffee shop" }),
      ]);
      expect(fetcher).toHaveBeenCalledWith(
        "https://duckduckgo.com/ac/?q=coffee&type=list",
        expect.objectContaining({ credentials: "omit" }),
      );
    } finally {
      fetcher.mockRestore();
    }
  });
});

describe("BrowserDataDO download metadata", () => {
  it("persists download metadata by host inside the canonical environment", () => {
    const db = new DatabaseSync(":memory:");
    const store = createBrowserDataDO(db);
    const record = {
      id: "download-1",
      environmentKey: "environment-1",
      hostId: "desktop:host-1",
      panelId: "panel-1",
      origin: "https://example.test",
      url: "https://example.test/archive.zip",
      filename: "archive.zip",
      savePath: "/tmp/archive.zip",
      receivedBytes: 25,
      totalBytes: 100,
      state: "progressing" as const,
      startedAt: 100,
      updatedAt: 110,
    };

    store.upsertDownloadRecord(record);
    store.upsertDownloadRecord({
      ...record,
      receivedBytes: 100,
      state: "completed",
      updatedAt: 120,
    });

    expect(store.listDownloadRecords("desktop:host-1")).toEqual([
      {
        ...record,
        receivedBytes: 100,
        state: "completed",
        updatedAt: 120,
      },
    ]);
    expect(store.listDownloadRecords("desktop:other-host")).toEqual([]);
    db.close();
  });
});

describe("BrowserDataDO native favicon formats", () => {
  it("stores validated source bytes and serves them by page or origin", () => {
    const db = new DatabaseSync(":memory:");
    const store = createBrowserDataDO(db);
    const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg"></svg>`);

    store.putPageFavicon({
      pageUrl: "https://example.test/one",
      origin: "https://example.test",
      sourceUrl: "https://example.test/favicon.svg",
      data: svg.toString("base64"),
      mimeType: "image/svg+xml",
      updatedAt: 123,
    });

    expect(store.getPageFavicon("https://example.test/one")).toMatchObject({
      page_url: "https://example.test/one",
      image_data: svg.toString("base64"),
      mime_type: "image/svg+xml",
      updated_at: 123,
    });
    expect(store.getPageFavicon("https://example.test/two")).toMatchObject({
      page_url: "https://example.test/one",
      mime_type: "image/svg+xml",
    });
    db.close();
  });

  it("rejects MIME labels that disagree with the icon bytes", () => {
    const db = new DatabaseSync(":memory:");
    const store = createBrowserDataDO(db);
    const ico = Buffer.from([0x00, 0x00, 0x01, 0x00, 0x01, 0x00]);

    expect(() =>
      store.putPageFavicon({
        pageUrl: "https://example.test/",
        origin: "https://example.test",
        data: ico.toString("base64"),
        mimeType: "image/png",
        updatedAt: 123,
      }),
    ).toThrow(/bytes are image\/x-icon, not image\/png/);
    db.close();
  });
});

function createBrowserDataDO(
  db: DatabaseSync,
  env: Record<string, unknown> = {},
): BrowserDataDO {
  const instance = new BrowserDataDO(sqliteContext(db), env);
  (instance as unknown as { ensureReady(): void }).ensureReady();
  return instance;
}

function sqliteContext(db: DatabaseSync): DurableObjectContext {
  const sql = {
    exec(query: string, ...bindings: unknown[]): SqlResult {
      const statement = db.prepare(query);
      const rows =
        /^\s*(?:SELECT|PRAGMA|WITH|EXPLAIN)\b/i.test(query) ||
        /\bRETURNING\b/i.test(query)
          ? (statement.all(...(bindings as [])) as Record<string, unknown>[])
          : (statement.run(...(bindings as [])), []);
      return {
        toArray: () => rows,
        one: () => {
          if (rows.length !== 1)
            throw new Error(`Expected one row, received ${rows.length}`);
          return rows[0]!;
        },
      };
    },
  };
  return {
    id: { toString: () => "browser-data-test", name: "browser-data-test" },
    storage: {
      sql,
      setAlarm() {},
      async getAlarm() {
        return null;
      },
      deleteAlarm() {},
      transactionSync<T>(callback: () => T): T {
        db.exec("BEGIN IMMEDIATE");
        try {
          const result = callback();
          db.exec("COMMIT");
          return result;
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      },
    },
    acceptWebSocket() {},
    getWebSockets: () => [],
    blockConcurrencyWhile: (fn) => fn(),
  };
}
