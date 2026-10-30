/**
 * The fixed sequence of a recall summary: ask memory, keep the snippets that bear on the query, state the fact
 * each gives, merge facts that agree and flag those that conflict. The model judges meaning; the ids, the support
 * check and the caveats that follow from the records are exact.
 */
import { memory } from "natlang:services";
import relevant from "./relevant.nl";
import factFrom from "./factFrom.nl";
import relate from "./relate.nl";
import { supported } from "./verify.js";
import type { Caveat, CitedFacts, Fact, Relation, Snippet } from "../types.js";

/** Facts compared pairwise at most; recall's best results come first. */
const FACTS = 4;
const OLD_DAYS = 180;
const NOTE =
  "Recall helps find things; it does not prove them. Verify against the source records the evidence points to.";
const KINDS = ["message", "file", "commit"] as const;

function kindOf(kind: string): Snippet["kind"] {
  const known = KINDS.find((candidate) => candidate === kind);
  if (!known)
    throw new Error(
      `memory.recall returned the unknown kind ${JSON.stringify(kind)}`,
    );
  return known;
}

export default async function recallSummary(
  query: string,
): Promise<CitedFacts> {
  const { results } = await memory.recall({ query, limit: 6 });
  const snippets: Snippet[] = results.map((result, index) => ({
    id: `e${index + 1}`,
    kind: kindOf(result.kind),
    where: result.where,
    at: result.appendedAt,
    text: result.snippet.slice(0, 700),
  }));
  const keep = await Promise.all(
    snippets.map((snippet) => relevant(query, snippet)),
  );
  const chosen = snippets.filter((_, index) => keep[index]).slice(0, FACTS);
  const sentences = await Promise.all(
    chosen.map((snippet) => factFrom(query, snippet)),
  );
  const stated = chosen.flatMap((snippet, index) =>
    supported(sentences[index]!, snippet.text)
      ? [{ text: sentences[index]!.trim(), snippet }]
      : [],
  );

  const pairs = stated.flatMap((_, first) =>
    stated
      .slice(first + 1)
      .map((__, offset) => [first, first + 1 + offset] as const),
  );
  const relations: Relation[] = await Promise.all(
    pairs.map(([first, second]) =>
      relate(stated[first]!.text, stated[second]!.text),
    ),
  );
  const group = stated.map((_, index) => index);
  pairs.forEach(([first, second], index) => {
    if (relations[index] !== "same") return;
    const from = group[second]!;
    for (let member = 0; member < group.length; member++)
      if (group[member] === from) group[member] = group[first]!;
  });
  const leaders = [...new Set(group)];
  const facts: Fact[] = leaders.map((leader) => {
    const members = stated.filter((_, index) => group[index] === leader);
    const evidence = members.map((member) => member.snippet);
    const rivals = pairs.flatMap(([first, second], index) =>
      relations[index] === "conflict" &&
      (group[first] === leader || group[second] === leader)
        ? [stated[group[first] === leader ? second : first]!.text]
        : [],
    );
    const caveats: Caveat[] = [];
    if (evidence.every((snippet) => snippet.kind === "message"))
      caveats.push({
        kind: "message-only",
        detail: "Every source is a conversation message, not committed state.",
      });
    if (evidence.length === 1)
      caveats.push({
        kind: "single-source",
        detail: "Only one snippet says this.",
      });
    const newest = Math.max(
      ...evidence.map((snippet) => (snippet.at ? Date.parse(snippet.at) : 0)),
    );
    if (newest > 0 && Date.now() - newest > OLD_DAYS * 86_400_000)
      caveats.push({
        kind: "old",
        detail: `The newest source was recorded ${new Date(newest).toISOString().slice(0, 10)}.`,
      });
    if (rivals.length > 0)
      caveats.push({
        kind: "conflicts",
        detail: `Another source says: ${rivals[0]}`,
      });
    return {
      text: members[0]!.text,
      evidence: evidence.map((snippet) => snippet.id),
      caveats,
    };
  });
  const cited = new Set(facts.flatMap((fact) => fact.evidence));
  return {
    query,
    facts,
    evidence: snippets.filter((snippet) => cited.has(snippet.id)),
    nothingFound: facts.length === 0,
    note: NOTE,
  };
}
