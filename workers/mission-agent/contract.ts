import { createReceiverRpcMethods } from "@vibestudio/shared/rpcMethods";
import type { MissionAgent } from "./index.js";
type Receiver = Pick<MissionAgent, "installTaskAutomation">;
export const missionAgentRpcMethods = createReceiverRpcMethods<Receiver>(["installTaskAutomation"]);
