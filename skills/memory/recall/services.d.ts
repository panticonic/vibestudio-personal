declare module "natlang:services" {
  /** Recall from workspace memory: past conversation messages, committed files, and commit summaries, with provenance. */
  export const memory: {
    recall(input: {
      query: string;
      kinds?: ("message" | "file" | "commit")[];
      limit?: number;
    }): Promise<{
      results: {
        kind: string;
        snippet: string;
        where: string;
        appendedAt: string | null;
      }[];
    }>;
  };
}
