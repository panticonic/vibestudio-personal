/** Exact checks on a stated fact against the snippet it cites. */

const words = (text: string) =>
  new Set(
    text
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((word) => word.length >= 5),
  );

/**
 * A sentence is supported by a snippet when it shares a content word with it and every number it states appears in
 * it: a fact may be reworded, but not given figures the source does not have.
 */
export function supported(sentence: string, snippet: string): boolean {
  if (sentence.trim() === "") return false;
  const known = words(snippet);
  if (![...words(sentence)].some((word) => known.has(word))) return false;
  return (sentence.match(/\d+(?:[.,]\d+)*/g) ?? []).every((figure) =>
    snippet.includes(figure),
  );
}
