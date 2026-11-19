import { createPanelSlot, panelTree } from "@workspace/runtime";
import type {
  CollectionMutation,
  CollectionNode,
  CollectionSnapshot,
} from "../collection-conductor/types.js";

export const collectionSource = "about/collection";

export function bindCollection(rootId: string, contextId: string, limit = 48) {
  const root = panelTree.get(rootId);
  let current: CollectionSnapshot | undefined;
  let writing = false;

  async function observe(): Promise<CollectionSnapshot> {
    const start = await panelTree.path(rootId);
    const rootNode = start?.entries.at(-1)?.node;
    if (
      !rootNode ||
      rootNode.slotId !== rootId ||
      rootNode.contextId !== contextId ||
      rootNode.source !== collectionSource
    )
      throw new Error(
        "The panel tree does not identify the assigned collection",
      );
    const { notes } = await root.stateArgs.get<{
      notes?: Record<string, string>;
    }>();
    const project = (node: typeof rootNode): CollectionNode => ({
      id: node.slotId,
      parentId: node.parentSlotId,
      title: node.title,
      source: node.source ?? null,
      contextId: node.contextId ?? null,
      note: notes?.[node.slotId] ?? null,
    });
    const nodes = [project(rootNode)];
    for await (const { node } of panelTree.walk(rootId, { limit }))
      nodes.push(project(node));
    const end = await panelTree.path(rootId);
    return {
      id: crypto.randomUUID(),
      rootId,
      complete: nodes.length <= limit && start?.revision === end?.revision,
      nodes,
    };
  }

  async function refresh() {
    current = await observe();
    return structuredClone(current);
  }

  function member(id: string, snapshot: CollectionSnapshot) {
    const node = snapshot.nodes.find((entry) => entry.id === id);
    if (!node) throw new Error("The panel is outside the assigned collection");
    return node;
  }

  async function effect(
    change: CollectionMutation,
    snapshot: CollectionSnapshot,
  ) {
    if ("panelId" in change) {
      member(change.panelId, snapshot);
      if (change.panelId === rootId)
        throw new Error("The change cannot target the collection root");
    }
    switch (change.kind) {
      case "rename":
        await panelTree
          .get(change.panelId)
          .setTitle(change.title, { explicit: true });
        return;
      case "note":
        await root.stateArgs.patch({
          notes: { [change.panelId]: change.text },
        });
        return;
      case "group":
      case "move": {
        const parent = member(change.parentId, snapshot);
        if (parent.source !== collectionSource)
          throw new Error("The destination is not a collection");
        if (change.kind === "group") {
          if (
            snapshot.nodes.some(
              (entry) =>
                entry.parentId === parent.id && entry.title === change.title,
            )
          )
            throw new Error("A direct child already uses the group title");
          await createPanelSlot(collectionSource, {
            parentId: parent.id,
            contextId,
            title: change.title,
          });
          return;
        }
        for (
          let node: CollectionNode | undefined = parent;
          node;
          node = snapshot.nodes.find((entry) => entry.id === node?.parentId)
        ) {
          if (node.id === change.panelId)
            throw new Error("A panel cannot move into its own subtree");
        }
        if (
          change.afterId &&
          (change.afterId === change.panelId ||
            member(change.afterId, snapshot).parentId !== parent.id)
        )
          throw new Error(
            "The anchor must be a different direct child of the destination",
          );
        const handle = panelTree.get(change.panelId);
        if (change.afterId === null) {
          await handle.movePanel(parent.id);
          return;
        }
        const siblings = snapshot.nodes.filter(
          (entry) => entry.parentId === parent.id && entry.id !== change.panelId,
        );
        const anchor = siblings.findIndex(({ id }) => id === change.afterId);
        // The wire fields name the preceding and following neighbors.
        const following = siblings[anchor + 1];
        await handle.movePanel(parent.id, {
          beforeSlotId: change.afterId,
          ...(following ? { afterSlotId: following.id } : {}),
        });
      }
    }
  }

  return {
    collectionState: {
      observe() {
        if (writing) throw new Error("A collection change is in progress");
        return refresh();
      },
    },
    collectionChange: {
      async apply(basisId: string, mutation: CollectionMutation) {
        if (writing || !current?.complete || current.id !== basisId)
          throw new Error("The supplied collection basis is unavailable");
        const basis = current;
        writing = true;
        try {
          const fresh = await observe();
          if (
            !fresh.complete ||
            JSON.stringify(fresh.nodes) !== JSON.stringify(basis.nodes)
          )
            throw new Error("The collection changed since the supplied basis");
          await effect(mutation, fresh);
          return await refresh();
        } finally {
          writing = false;
        }
      },
    },
  };
}
