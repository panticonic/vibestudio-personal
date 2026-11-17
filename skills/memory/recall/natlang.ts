import recallSummary from "./recallSummary.nl";
import type { CitedFacts } from "./types.js";

/** What workspace memory holds about a query, every fact tied to the snippets that say it. */
export function recall(query: string, asOf = Date.now()): Promise<CitedFacts> {
  return recallSummary(query, asOf);
}

export { recallSummary };
