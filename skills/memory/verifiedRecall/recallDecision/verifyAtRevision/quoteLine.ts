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
  const [quote] = matches;
  if (!quote || matches.length !== 1 || quote !== lines[index]) return null;
  return {
    eventId: file.eventId,
    path: file.path,
    contentHash: file.contentHash,
    line: index + 1,
    quote,
  };
}
