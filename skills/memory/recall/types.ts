/** One thing workspace memory returned, trimmed and given an id the facts cite. */
export type Snippet = {
  /** Cited by facts: "e1", "e2", ... in the order recall returned them. */
  id: string;
  /** message: a past conversation message; file: committed file content; commit: a commit summary. */
  kind: "message" | "file" | "commit";
  /** The file path, the authoring participant, or the event id. */
  where: string;
  /** When it was recorded (ISO time); null when unknown. */
  at: string | null;
  /** The matching text, at most 700 characters. */
  text: string;
};

/** How two facts about the same query relate. */
export type Relation = "same" | "conflict" | "unrelated";

export type Caveat = {
  /** message-only: every source is a conversation message, not committed state. single-source: one snippet only. old: the newest source is more than 180 days old. conflicts: another fact says otherwise. */
  kind: "message-only" | "single-source" | "old" | "conflicts";
  detail: string;
};

export type Fact = {
  /** One sentence, restating what the cited snippets say. */
  text: string;
  /** Ids of the snippets that say it; never empty. */
  evidence: string[];
  caveats: Caveat[];
};

export type CitedFacts = {
  query: string;
  facts: Fact[];
  /** The snippets the facts cite, exactly as recall returned them (trimmed). */
  evidence: Snippet[];
  /** recall found nothing, or nothing in it bears on the query. */
  nothingFound: boolean;
  /** Always the same reminder: recall helps find things; it does not prove them. Verify against the source records. */
  note: string;
};
