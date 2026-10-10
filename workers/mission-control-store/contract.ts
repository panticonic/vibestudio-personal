import { createReceiverRpcMethods } from "@vibestudio/shared/rpcMethods";
import type { MissionControlStore } from "./index.js";
type Receiver = Pick<MissionControlStore, "overview" | "getTask" | "taskOptions" | "createProject" | "updateProject" | "createTask" | "updateTask" | "addNote" | "duplicateTask" | "setView" | "saveView" | "removeView" | "taskDetail" | "configureAutomation" | "startTask" | "controlTask" | "cancelTask" | "lead">;
export const missionControlRpcMethods = createReceiverRpcMethods<Receiver>(["overview","getTask","taskOptions","createProject","updateProject","createTask","updateTask","addNote","duplicateTask","setView","saveView","removeView","taskDetail","configureAutomation","startTask","controlTask","cancelTask","lead"]);
