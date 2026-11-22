import { isDeepStrictEqual } from "node:util";
import { prepareManagedBrowserLibrary } from "@workspace-skills/browser-library-runtime/managed";
import { prepareManagedCollection } from "@workspace-skills/collection-conductor-runtime/managed";
import type { BrowserLibraryReport } from "../browser-library/types.js";
import type { CollectionReport } from "../collection-conductor/types.js";

type Inputs = {
  contextId: string;
  assignment: {
    id: string;
    bookmarkKey: string;
    path: string;
    panel: { title: string; parent?: string; key: string };
    heading: string;
    goal: string;
  };
  library: Parameters<typeof prepareManagedBrowserLibrary>[1];
  history: Parameters<typeof prepareManagedBrowserLibrary>[2];
  collectionRoot: Parameters<typeof prepareManagedCollection>[2];
  collectionSeed: Parameters<typeof prepareManagedCollection>[3];
};

type WorkflowReport = {
  results: {
    kind: string;
    domain: string;
    operation: string;
    report: unknown;
  }[];
  remaining: string[];
};

export async function prepareManagedBrowserHandoff(input: Inputs) {
  const {
    contextId,
    assignment,
    library,
    history,
    collectionRoot,
    collectionSeed,
  } = input;
  const browser = await prepareManagedBrowserLibrary(
    contextId,
    library,
    history,
  );
  try {
    const url = browser.origin + assignment.path;
    const { key, ...target } = assignment.panel;
    const text = `${assignment.heading}: ${url}`;
    const collection = await prepareManagedCollection(
      contextId,
      {
        id: assignment.id,
        request: {
          goal: "Put the verified browser bookmark URL on the assigned handoff panel.",
          actions: [{ kind: "note", target, text }],
        },
        expected: [{ kind: "note", key }],
      },
      collectionRoot,
      collectionSeed,
    );

    const workflowRequest = {
      goal: `${assignment.goal} Complete Browser library first. Inspect its report before invoking Collection conductor. Continue only when each browser action has a held or verified finding and at least one is verified. Keep both skill reports.`,
      // The root needs to infer the prerequisite even when the dependent
      // assignment is presented first.
      work: [
        {
          kind: "domain",
          domain: "collection",
          operation: "organizeCollection",
          input: collection.request,
        },
        {
          kind: "domain",
          domain: "browserLibrary",
          operation: "curateBrowserLibrary",
          input: browser.request,
        },
      ],
    };

    type Receipt = { snapshotId: string; bookmarkId: number; url: string };
    const receipts: Receipt[] = [];
    async function readReceipt(): Promise<Receipt> {
      const result = await browser.verify(null);
      const ending = result.transitions.at(-1)?.after;
      const id = result.assignments[assignment.bookmarkKey];
      const bookmark = ending?.bookmarks.find(
        (row) => row.id === id && row.url === url,
      );
      if (
        !result.checks.initial ||
        !result.checks.exactEffects ||
        !result.checks.metadata ||
        !result.checks.outside ||
        !ending ||
        !bookmark
      ) {
        throw new Error(
          "The assigned browser bookmark has no verified readback",
        );
      }
      return {
        snapshotId: ending.id,
        bookmarkId: bookmark.id,
        url: bookmark.url,
      };
    }

    const services = {
      ...browser.services,
      collectionState: {
        async observe() {
          const receipt = await readReceipt();
          const state = await collection.services.collectionState.observe();
          receipts.push(receipt);
          return state;
        },
      },
      collectionChange: {
        async apply(
          ...args: Parameters<typeof collection.services.collectionChange.apply>
        ) {
          const receipt = await readReceipt();
          const state = await collection.services.collectionChange.apply(
            ...args,
          );
          receipts.push(receipt);
          return state;
        },
      },
    };

    async function verify(report: WorkflowReport | null) {
      const [libraryRow, collectionRow] = report?.results ?? [];
      const browserEvidence = await browser.verify(
        libraryRow?.report as BrowserLibraryReport | null,
      );
      const collectionEvidence = await collection.verify(
        collectionRow?.report as CollectionReport | null,
      );
      const last = collectionEvidence.transitions.at(-1)?.after;
      const panelId = collectionEvidence.assignments[key];
      const checks = {
        browser: browserEvidence.passed,
        collection: collectionEvidence.passed,
        reports:
          report?.results.length === 2 &&
          report.remaining.length === 0 &&
          libraryRow?.kind === "domain" &&
          libraryRow.domain === "browserLibrary" &&
          libraryRow.operation === "curateBrowserLibrary" &&
          collectionRow?.kind === "domain" &&
          collectionRow.domain === "collection" &&
          collectionRow.operation === "organizeCollection",
        dependency:
          browserEvidence.passed &&
          receipts.length > 0 &&
          receipts.every((receipt) =>
            isDeepStrictEqual(receipt, receipts[0]),
          ) &&
          receipts[0]?.bookmarkId ===
            browserEvidence.assignments[assignment.bookmarkKey] &&
          receipts[0]?.snapshotId ===
            browserEvidence.transitions.at(-1)?.after.id &&
          receipts[0]?.url === url &&
          last?.nodes.some(
            (node) => node.id === panelId && node.note === text,
          ) === true,
      };
      return {
        caseId: assignment.id,
        contextId,
        checks,
        receipts,
        browser: browserEvidence,
        collection: collectionEvidence,
        panelId,
        note: text,
        passed: Object.values(checks).every(Boolean),
      };
    }

    async function qualify() {
      let rejectsEarly = false;
      try {
        await services.collectionState.observe();
      } catch (error) {
        rejectsEarly =
          error instanceof Error &&
          error.message.includes("no verified readback");
      }
      const browserReport = await browser.reference();
      const collectionReport = await collection.reference(services);
      const report = {
        results: [
          {
            kind: "domain",
            domain: "browserLibrary",
            operation: "curateBrowserLibrary",
            report: browserReport,
          },
          {
            kind: "domain",
            domain: "collection",
            operation: "organizeCollection",
            report: collectionReport,
          },
        ],
        remaining: [],
      };
      const verification = await verify(report);
      const rejectsWrongOrder = !(
        await verify({ ...report, results: [...report.results].reverse() })
      ).passed;
      return { verification, rejectsEarly, rejectsWrongOrder };
    }

    return { workflowRequest, services, verify, qualify, close: browser.close };
  } catch (error) {
    await browser.close();
    throw error;
  }
}
