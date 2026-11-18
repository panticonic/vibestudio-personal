import type { PersonalMemoryHit, PersonalMemoryResult } from "../../types.js";

export default function preserveSources(
  results: PersonalMemoryResult[],
): PersonalMemoryHit[] {
  return results.flatMap((row, index) => {
    const { kind, snippet, where, appendedAt } = row;
    if (kind !== "message" && kind !== "file" && kind !== "commit") return [];
    return [
      {
        id: `e${index + 1}`,
        kind,
        snippet,
        where,
        appendedAt,
        path: row.path ?? null,
        eventId: row.eventId ?? null,
        logId: row.logId ?? null,
        head: row.head ?? null,
        contentHash: row.contentHash ?? null,
      },
    ];
  });
}
