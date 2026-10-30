# recallSummary: decomposition

`recallSummary(query): CitedFacts` states what workspace memory holds about a query, with every fact tied to the
snippet ids that say it. Recall "helps find things; it does not prove them": the result says so, and flags the facts
that rest on weak sources or contradict each other. The program reads memory (`memory.recall`) and nothing else.

| Part                                   | Form                                                                                    | Why                                                                                                                                                                                            |
| -------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ask memory, number the results         | crisp: `recallSummary/recall.ts`                                                        | `e1..eN` in recall's order, snippet text cut at 700 characters; the ids are what facts cite.                                                                                                   |
| Does a snippet bear on the query       | its own function, `relevant` (`readout: decision`, boolean)                             | Recall's score is lexical; "shares words" and "states a fact about it" differ. One scored pass per snippet.                                                                                    |
| State the fact a snippet gives         | its own function, `factFrom`                                                            | One sentence from one snippet: the evidence is the snippet by construction.                                                                                                                    |
| Check the fact                         | crisp: `verify.ts` `supported`                                                          | The sentence shares a content word with its snippet and every number in it appears in the snippet. A fact that fails is dropped.                                                               |
| Do two facts agree, conflict or differ | its own function, `relate` (`readout: decision`, `"same" \| "conflict" \| "unrelated"`) | Semantic comparison, pairwise over at most 4 facts. `same` merges the evidence of both; `conflict` becomes a caveat on both.                                                                   |
| Caveats from the records               | crisp                                                                                   | `message-only` (every source is a conversation message), `single-source`, `old` (newest source more than 180 days old) follow from kinds, counts and timestamps. Judging them would add error. |
| Reminder                               | constant `note`                                                                         | Always the same sentence.                                                                                                                                                                      |

## Measurement

`cases.jsonl`: real commit messages of this repository and excerpts of its files, with conversation messages written
for the cases (no transcript is recorded). Cases cover conflicting messages, a stale commit, a single message source, a
fact stated twice, and a query nothing answers. Quality: coverage of the expected facts (60%) and the right caveats (40%),
zero when a distractor leaks into a fact. Gates: 0.85 on validation and on the locked test split, and every fact tied to listed evidence (`cited`).
