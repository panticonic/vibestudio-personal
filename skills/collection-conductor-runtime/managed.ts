import { isDeepStrictEqual } from "node:util";
import { createPanelSlot, panelTree } from "@workspace/runtime";
import { bindCollection, collectionSource } from "./index.js";
import type { CollectionRequest } from "../collection-conductor/types.js";

type Bound = ReturnType<typeof bindCollection>;
type Snapshot = Awaited<ReturnType<Bound["collectionState"]["observe"]>>;
type Mutation = Parameters<Bound["collectionChange"]["apply"]>[1];
type Finding = {
  status: "verified" | "held" | "unverified";
  evidence: string[];
  panelId: string | null;
};
type Report = { results: Finding[] };

const leafSource = "about/help";
const initialNotes: Record<string, string> = {
  inbox: "Stale intake note",
  reference: "Keep this reference",
};

type SeedPanel = {
  key: string;
  parent: string;
  title: string;
  collection: boolean;
};
type Expected =
  | { kind: "held" }
  | { kind: "rename" | "note"; key: string }
  | { kind: "group"; parent: string; key: string }
  | { kind: "move"; key: string; parent: string; after: string | null };

export async function prepareManagedCollection(
  contextId: string,
  world: {
    id: string;
    request: CollectionRequest;
    expected: readonly Expected[];
  },
  collectionRootTitle: string,
  collectionSeed: readonly SeedPanel[],
) {
  const caseId = world.id;
  const root = await createPanelSlot(collectionSource, {
    contextId,
    parentId: null,
    title: collectionRootTitle,
  });
  const ids = new Map([["root", root.id]]);
  const assignedId = (key: string, keys = ids) => {
    const id = keys.get(key);
    if (!id) throw new Error(`Missing collection fixture key ${key}`);
    return id;
  };
  for (const spec of collectionSeed) {
    const child = await createPanelSlot(
      spec.collection ? collectionSource : leafSource,
      {
        contextId,
        parentId: assignedId(spec.parent),
        title: spec.title,
      },
    );
    ids.set(spec.key, child.id);
  }
  await root.stateArgs.patch({
    notes: Object.fromEntries(
      Object.entries(initialNotes).map(([key, value]) => [
        assignedId(key),
        value,
      ]),
    ),
  });
  const outside = await createPanelSlot(leafSource, {
    contextId,
    parentId: null,
    title: "Outside",
  });
  const bound = bindCollection(root.id, contextId);
  const { request, expected } = world;
  let baseline: Snapshot | undefined;
  const transitions: { mutation: Mutation; after: Snapshot }[] = [];
  const services = {
    collectionState: {
      async observe() {
        if (baseline)
          throw new Error(
            "The collection assignment has one initial observation",
          );
        baseline = await bound.collectionState.observe();
        return structuredClone(baseline);
      },
    },
    collectionChange: {
      async apply(basisId: string, mutation: Mutation) {
        const after = await bound.collectionChange.apply(basisId, mutation);
        transitions.push({
          mutation: structuredClone(mutation),
          after: structuredClone(after),
        });
        return after;
      },
    },
  };

  function expectedMutation(
    index: number,
    keys: Map<string, string>,
  ): Mutation | null {
    const action = request.actions[index]!;
    const plan = expected[index]!;
    if (plan.kind === "rename" && action.kind === "rename")
      return {
        kind: "rename",
        panelId: assignedId(plan.key, keys),
        title: action.title,
      };
    if (plan.kind === "note" && action.kind === "note")
      return {
        kind: "note",
        panelId: assignedId(plan.key, keys),
        text: action.text,
      };
    if (plan.kind === "group" && action.kind === "group")
      return {
        kind: "group",
        parentId: assignedId(plan.parent, keys),
        title: action.title,
      };
    if (plan.kind === "move" && action.kind === "move")
      return {
        kind: "move",
        panelId: assignedId(plan.key, keys),
        parentId: assignedId(plan.parent, keys),
        afterId: plan.after ? assignedId(plan.after, keys) : null,
      };
    if (plan.kind === "held") return null;
    throw new Error("Inconsistent collection case");
  }

  const groupMember = (before: Snapshot, after: Snapshot) => {
    const added = after.nodes.filter(
      ({ id }) => !before.nodes.some((entry) => entry.id === id),
    );
    return added.length === 1 ? added[0]!.id : null;
  };

  function verifyEffect(
    before: Snapshot,
    after: Snapshot,
    mutation: Mutation,
    targetId: string,
  ) {
    if (!after.complete || after.rootId !== root.id || before.id === after.id)
      return false;
    const expectedNodes = structuredClone(before.nodes);
    if (mutation.kind === "group") {
      expectedNodes.push({
        id: targetId,
        parentId: mutation.parentId,
        title: mutation.title,
        source: collectionSource,
        contextId,
        note: null,
      });
    } else {
      const target = expectedNodes.find(({ id }) => id === targetId);
      if (!target) return false;
      if (mutation.kind === "rename") target.title = mutation.title;
      if (mutation.kind === "note") target.note = mutation.text;
      if (mutation.kind === "move") target.parentId = mutation.parentId;
    }
    const expectedById = new Map(expectedNodes.map((node) => [node.id, node]));
    if (
      expectedById.size !== after.nodes.length ||
      !after.nodes.every(
        (node) =>
          JSON.stringify(expectedById.get(node.id)) === JSON.stringify(node),
      )
    )
      return false;
    const kids = (snapshot: Snapshot, parentId: string) =>
      snapshot.nodes
        .filter((node) => node.parentId === parentId)
        .map(({ id }) => id);
    return expectedNodes.every(({ id }) => {
      const order = kids(before, id).filter(
        (child) => mutation.kind !== "move" || child !== targetId,
      );
      if (
        (mutation.kind === "group" || mutation.kind === "move") &&
        mutation.parentId === id
      ) {
        const at =
          mutation.kind === "move" && mutation.afterId
            ? order.indexOf(mutation.afterId) + 1
            : 0;
        order.splice(at, 0, targetId);
      }
      return JSON.stringify(order) === JSON.stringify(kids(after, id));
    });
  }

  async function verify(report: Report | null) {
    const starting = baseline;
    const keys = new Map(ids);
    const expectedFindings: Finding[] = [];
    const currentOutside = await panelTree.path(outside.id);
    const checks = {
      baseline:
        starting?.complete === true &&
        starting.rootId === root.id &&
        starting.nodes.length === collectionSeed.length + 1 &&
        collectionSeed.every((spec) =>
          starting.nodes.some(
            (node) =>
              node.id === ids.get(spec.key) &&
              node.parentId === ids.get(spec.parent) &&
              node.title === spec.title &&
              node.note === (initialNotes[spec.key] ?? null),
          ),
        ),
      outsideUnchanged:
        currentOutside?.entries.length === 1 &&
        currentOutside.entries[0]?.node.title === "Outside" &&
        currentOutside.entries[0]?.node.slotId === outside.id,
      exactEffects: false,
      reportMatches: false,
    };
    if (starting) {
      let before = starting;
      let applied = 0;
      checks.exactEffects =
        request.actions.every((_, index) => {
          const change = expectedMutation(index, keys);
          if (!change) {
            expectedFindings.push({
              status: "held",
              evidence: [before.id],
              panelId: null,
            });
            return true;
          }
          const receipt = transitions[applied++];
          if (!receipt || !isDeepStrictEqual(change, receipt.mutation))
            return false;
          const { after } = receipt;
          const targetId =
            change.kind === "group"
              ? groupMember(before, after)
              : change.panelId;
          if (!targetId || !verifyEffect(before, after, change, targetId))
            return false;
          const plan = expected[index];
          if (plan?.kind === "group") keys.set(plan.key, targetId);
          expectedFindings.push({
            status: "verified",
            evidence: [before.id, after.id],
            panelId: targetId,
          });
          before = after;
          return true;
        }) && applied === transitions.length;
      checks.reportMatches =
        Array.isArray(report?.results) &&
        report.results.length === expectedFindings.length &&
        expectedFindings.every((row, index) => {
          const value = report.results[index];
          return (
            value?.status === row.status &&
            value.panelId === row.panelId &&
            JSON.stringify(value.evidence) === JSON.stringify(row.evidence)
          );
        });
    }
    return {
      contextId,
      caseId,
      rootId: root.id,
      baseline,
      transitions,
      assignments: Object.fromEntries(keys),
      checks,
      passed: Object.values(checks).every(Boolean),
    };
  }

  async function reference(ports = services): Promise<Report> {
    let before = await ports.collectionState.observe();
    const keys = new Map(ids);
    const results: Finding[] = [];
    for (const [index, plan] of expected.entries()) {
      const change = expectedMutation(index, keys);
      if (!change) {
        results.push({ status: "held", evidence: [before.id], panelId: null });
        continue;
      }
      const after = await ports.collectionChange.apply(before.id, change);
      const targetId =
        change.kind === "group" ? groupMember(before, after) : change.panelId;
      if (plan.kind === "group" && targetId) keys.set(plan.key, targetId);
      results.push({
        status: "verified",
        evidence: [before.id, after.id],
        panelId: targetId,
      });
      before = after;
    }
    return { results };
  }

  async function rejectsOutside() {
    const basis = await bound.collectionState.observe();
    try {
      await bound.collectionChange.apply(basis.id, {
        kind: "rename",
        panelId: outside.id,
        title: "Invalid",
      });
      return false;
    } catch (error) {
      return (
        error instanceof Error &&
        error.message.includes("outside the assigned collection")
      );
    }
  }
  return { request, services, verify, reference, rejectsOutside };
}
