import type { Scope, Source } from "./types.js";
declare module "natlang:services" {
  export const archiveTimeline: {
    discover(): Promise<Scope>;
    list(eventId: string): Promise<string[]>;
    read(eventId: string, path: string): Promise<Source | null>;
  };
}
