declare module "natlang:services" {
  export const tourRehearsal: {
    /** Read the assigned panel's current frame and native scene registry. */
    observe(operationId: string): Promise<import("./types.js").TourStart>;
    /** Apply and read back one authorized stop on the assigned panel. */
    visit(operationId: string, scene: string, notes: boolean): Promise<import("./types.js").TourFrame>;
    /** Restore the exact opening scene and presenter-notes choice. */
    restore(operationId: string): Promise<import("./types.js").TourFrame>;
  };
}
