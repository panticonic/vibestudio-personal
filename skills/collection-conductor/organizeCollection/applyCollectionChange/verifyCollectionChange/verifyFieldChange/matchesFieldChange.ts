import type { CollectionMutation, CollectionSnapshot } from "../../../../types.js";

export default function matchesFieldChange(
  before: CollectionSnapshot,
  after: CollectionSnapshot,
  mutation: CollectionMutation,
): boolean {
  if (
    (mutation.kind !== "rename" && mutation.kind !== "note") ||
    !before.complete || !after.complete ||
    before.rootId !== after.rootId ||
    before.nodes.length !== after.nodes.length ||
    before.nodes.filter(({ id }) => id === mutation.panelId).length !== 1
  ) return false;

  return before.nodes.every((old, index) => {
    const current = after.nodes[index]!;
    const target = old.id === mutation.panelId;
    const title = target && mutation.kind === "rename" ? mutation.title : old.title;
    const note = target && mutation.kind === "note" ? mutation.text : old.note;
    return current.id === old.id &&
      current.parentId === old.parentId &&
      current.contextId === old.contextId &&
      current.source === old.source &&
      current.title === title &&
      current.note === note;
  });
}
