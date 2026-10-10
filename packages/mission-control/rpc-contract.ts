import { createReceiverRpcMethods } from "@vibestudio/shared/rpcMethods";
import type {
  Automation,
  Overview,
  Project,
  SavedView,
  Session,
  Task,
  TaskDetail,
  TaskEvent,
  View,
} from "./index.js";

export interface MissionControlStoreRpc {
  overview(input?: { cursor?: string; limit?: number }): Overview;
  getTask(input: { id: string }): Task;
  taskOptions(input?: {
    projectId?: string;
    query?: string;
    cursor?: string;
    limit?: number;
  }): { tasks: Task[]; cursor: string | null };
  createProject(input: unknown): Project;
  updateProject(input: unknown): Promise<Project>;
  createTask(input: unknown): Task;
  updateTask(input: unknown): Task;
  addNote(input: unknown): TaskEvent;
  duplicateTask(input: unknown): Task;
  setView(input: unknown): View;
  saveView(input: unknown): SavedView;
  removeView(input: { id: string }): void;
  taskDetail(input: {
    id: string;
    cursor?: { startedAt: number; runId: string };
    activityCursor?: string;
  }): Promise<TaskDetail>;
  configureAutomation(input: unknown): Promise<Automation>;
  startTask(input: unknown): Promise<Session>;
  controlTask(input: unknown): Promise<Automation>;
  cancelTask(input: unknown): Promise<Task>;
  lead(): Promise<{ channelId: string; contextId: string }>;
}

export interface MissionAgentRpc {
  installTaskAutomation(input: unknown): Promise<Automation>;
}

export const missionControlRpcMethods =
  createReceiverRpcMethods<MissionControlStoreRpc>([
    "overview",
    "getTask",
    "taskOptions",
    "createProject",
    "updateProject",
    "createTask",
    "updateTask",
    "addNote",
    "duplicateTask",
    "setView",
    "saveView",
    "removeView",
    "taskDetail",
    "configureAutomation",
    "startTask",
    "controlTask",
    "cancelTask",
    "lead",
  ]);

export const missionAgentRpcMethods = createReceiverRpcMethods<MissionAgentRpc>(
  ["installTaskAutomation"],
);
