import { defineEvaluationSuite } from "@workspace/natlang/evaluation";
import { executorIdentityForChoice, loadModelConfiguration } from "@workspace/natlang/model";
import type { FailureCause, GitHubAccessLevel, NextStep } from "./types.js";

// The executor's production call budget (Base model-catalog MODEL_ROLE_CALL_BUDGETS.executor): the gates measure the
// bounds the program runs under. A suite cannot import workspace source, so it is restated here.
const EXECUTOR_BUDGET = { maxTurns: 12, maxTokens: 16384 };

/** What `score` returns: the gates are a plain boolean record, whichever function the case exercises. */
type Metric = {
  quality: number;
  gates: Record<string, boolean>;
  feedback: string;
};

/** One suite, two functions: each case names the function it exercises. */
type CaseInput =
  | { function: "accessLevelFor"; input: string }
  | { function: "troubleshootGithub"; input: string };
type CaseExpected = GitHubAccessLevel | FailureCause;

// Gates for porting (DECOMPOSITION.md): accuracy of at least 0.85 on validation and on the locked test split.
export default defineEvaluationSuite<CaseInput, CaseExpected>({
  id: "github-v1",
  program: { root: ".", id: "github", entry: "natlang.ts" },
  components: "lambda-only",
  cases: "./cases.jsonl",
  models: { executor: "default" },
  executorIdentity: executorIdentityForChoice(loadModelConfiguration("default").choice),
  policy: { codeEdits: "deny", settings: EXECUTOR_BUDGET },
  budget: { maxRollouts: 80, maxProposals: 0, maxModelCalls: 1200 },
  fixture: {
    async create(testCase, context) {
      const app = (await context.loadFreshProgram()) as {
        accessLevelFor(intent: string): Promise<GitHubAccessLevel>;
        troubleshootGithub: { collect(failure: string): Promise<NextStep> };
      };
      const input = testCase.input;
      if (input.function === "accessLevelFor") {
        return { execute: () => context.runtime.run(() => app.accessLevelFor(input.input)) };
      }
      return {
        execute: () => context.runtime.run(() => app.troubleshootGithub.collect(input.input)),
      };
    },
  },
  score(testCase, observation, outcome): Metric {
    const result = (observation as { result?: unknown }).result;
    const expected = testCase.expected!;
    // accessLevelFor answers the level; troubleshootGithub answers the steps of a cause, so its cause is compared.
    const answer =
      testCase.input.function === "troubleshootGithub"
        ? (result as NextStep | undefined)?.cause
        : result;
    const exact = outcome.kind === "returned" && answer === expected;
    return {
      quality: exact ? 1 : 0,
      gates: { completed: outcome.kind === "returned", exact },
      feedback: exact
        ? "Correct."
        : `Expected ${expected}; got ${answer ?? outcome.error?.outcome}.`,
    };
  },
  feedback(testCase, result) {
    return { input: testCase.input.function, actual: result.outcome.value ?? null };
  },
});
