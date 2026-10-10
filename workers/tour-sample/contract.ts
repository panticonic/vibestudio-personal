import { createReceiverRpcMethods } from "@vibestudio/shared/rpcMethods";
import type { TourSample } from "./index.js";
type Receiver = Pick<TourSample, "read">;
export const tourSampleRpcMethods = createReceiverRpcMethods<Receiver>(["read"]);
