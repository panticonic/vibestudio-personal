import type { DecisionCitation, DecisionFile } from "../../types.js";

export function cite(
  file: DecisionFile,
  field: string,
  index: number | null,
): DecisionCitation | null {
  if (index === null || !Number.isInteger(index) || index < 0) return null;
  const lines = file.text.split(/\r?\n/u);
  const prefix = `${field}:`;
  const matches = lines.filter(
    (line) => line.startsWith(prefix) && line.slice(prefix.length).trim(),
  );
  if (matches.length !== 1 || matches[0] !== lines[index]) return null;
  return {
    eventId: file.eventId,
    path: file.path,
    contentHash: file.contentHash,
    line: index + 1,
    quote: matches[0],
  };
}
