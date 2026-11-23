declare module "natlang:services" {
  export const archiveTimeline: {
    discover(): Promise<import("./types.js").Scope>;
    list(eventId: string): Promise<string[]>;
    read(eventId: string, path: string): Promise<import("./types.js").Source | null>;
  };
}
