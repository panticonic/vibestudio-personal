declare module "natlang:services" {
  export const memory: {
    recall(input: {
      query: string;
      kinds?: ("message" | "file" | "commit")[];
      limit?: number;
    }): Promise<{ results: import("./types.js").PersonalMemoryResult[] }>;
  };
  export const repositoryResumeRead: {
    inspect(operationId: string): Promise<import("./types.js").PersonalRepoRequest>;
  };
  export const repositoryOwnerRead: {
    resolve(operationId: string, action: "setup" | "check"): Promise<import("./types.js").PersonalSetupRequest>;
  };
}
