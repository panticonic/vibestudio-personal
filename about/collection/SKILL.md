---
name: collection-conductor
description: Inspect, annotate, automate, title, group, move, or recursively reorganize the panel subtree owned by a Vibestudio collection conductor.
---

# Collection conductor

The collection system prompt gives you a stable `rootPanelId`. That ID defines
your scope; a list of panel IDs in chat does not. Walk the subtree with a work
limit:

```ts
import { panelTree } from "@workspace/runtime";

for await (const { node, handle, depth } of panelTree.walk(rootPanelId, {
  limit: 500,
})) {
  console.log(depth, handle.id, handle.title, node.childCount);
}
```

The walk is breadth-first, follows page cursors, and restarts when the tree
changes mid-walk (because of the user, another agent, or another client)
without yielding a panel twice. Pick a limit that fits the request. If you
receive `limit` entries the subtree may hold more; ask the user to narrow the
scope instead of silently going past it. `node.childCount === 0` means the
panel has no children; it does not mean the panel is a browser panel. After a
create, move, close, or batch rename, walk again rather than reusing old
entries. Never keep a full copy of the tree in eval state.

## Titles and notes

Use titles that help navigation, not descriptions. `handle` is the entry's
handle from the walk:

```ts
await handle.setTitle("Gmail · Support inbox", { explicit: true });
```

An explicit title is kept when the document's own title changes. Prefer the
existing page title and URL metadata. Do not load every deferred browser panel
just to replace a title that is already useful.

A collection panel shows its slot title, so `setTitle` alone renames it
everywhere.

Notes for a collection scope live in the root collection's `stateArgs.notes`
map, keyed by stable panel slot ID. Merge into it so unrelated state is kept:

```ts
const root = panelTree.get(rootPanelId);
await root.stateArgs.patch({
  notes: { [targetPanelId]: "Needs account selection" },
});
```

To remove an obsolete note, write the map back without that key. Do not put
workspace context IDs or other permission data in state args.

## Grouping and moving

Create a nested collection only for a stable, useful concept, not just because
several URLs share a hostname:

```ts
import { openPanel } from "@workspace/runtime";

const group = await openPanel("about/collection", {
  parentId: rootPanelId,
  contextId: panelTree.get(rootPanelId).contextId,
  title: "Release engineering",
  focus: false,
  stateArgs: {
    note: "Builds, CI runs, and release artifacts",
  },
});
```

Nested collections created for grouping share the root collection's
orchestration context. That lets every collection conductor in the subtree
supervise it without a permission prompt per panel. Always pass `contextId`;
leaving it out creates an unrelated context for the nested collection.

Move or reorder existing panels with their handles. With no placement, the
panel goes to the top of the new parent; pass `{ beforeSlotId }` or
`{ afterSlotId }` to place it next to a sibling:

```ts
await handle.movePanel(group.id);
await handle.movePanel(group.id, { afterSlotId: siblingId });
```

Rules:

- Never move the scope root into its own subtree.
- Keep useful imported-window structure unless a semantic grouping is clearly
  better.
- Moving a collection moves its whole subtree; do not move its descendants
  separately.
- After a structural batch, refresh and check the resulting parent IDs and
  order.
- Leave ambiguous panels where they are and ask the user instead of inventing a
  taxonomy.

Where a panel sits in the tree does not determine what it may do. Two
relationships give the collection prompt-free control:

- Nested collections in the subtree share the root's orchestration context.
- Panels spawned by the collection, its bound agent, or that agent's eval are
  tied to their creator through immutable runtime ancestry.

An unrelated panel moved into the collection keeps its original context and
provenance. Moving it there does not give the collection runtime or CDP control
over it. The first cross-context operation on it asks for the normal approval
for that requester and target context; the resulting grant covers that context,
so later operations do not prompt again.

## Browser automation

Inspecting the tree, renaming, notes, and moving do not need a browser runtime.
Use CDP only when you need page content:

```ts
const browserEntries = [];
for await (const entry of panelTree.walk(rootPanelId, { limit: 200 })) {
  if (entry.node.kind === "browser") browserEntries.push(entry);
}
const cdpSession = await browserEntries[0].handle.cdp.session();
const cdpPage = cdpSession.page;
console.log(await cdpPage.title(), cdpPage.url());
```

Connecting CDP loads a deferred panel. Mass imports are left unloaded on
purpose, so never connect every leaf with an unbounded `Promise.all`. Work in
small batches (usually 2–4), record failures per panel, and refresh the subtree
between batches if the user may be editing it at the same time.

Reuse one CDP page while the panel's runtime stays the same. If `observe()`
reports a different `runtimeEntityId` after navigation or a rebuild, drop the
old page and get a new one.

## Completion

After changing a collection:

1. Refresh the subtree.
2. Check titles, parent IDs, and child order in the new snapshot.
3. Report structural changes separately from content automation.
4. List panels you left ambiguous and any CDP failures; a failure on one panel
   does not stop the rest of the batch.
