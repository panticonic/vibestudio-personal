declare module "natlang:services" {
  export const explorerTextProbe: {
    /** Read fixed metric expectations for the caller's assigned text. */
    input(operationId: string): Promise<import("./types.js").TextProbeInput>;
    /** Execute the agreed scratch and blobstore experiment and return its receipt. */
    run(operationId: string, plan: import("./types.js").TextProbePlan): Promise<import("./types.js").TextProbeReceipt>;
  };
}
