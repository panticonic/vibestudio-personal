declare module "natlang:services" {
  export const memory: {
    recall(input: {
      query: string;
      kinds?: ("message" | "file" | "commit")[];
      limit?: number;
    }): Promise<{ results: import("./types.js").PersonalMemoryResult[] }>;
  };
}
