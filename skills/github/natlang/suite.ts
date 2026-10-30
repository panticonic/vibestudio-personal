import { defineEvaluationSuite } from "@workspace/natlang/evaluation";
import { executorIdentityForChoice, loadModelConfiguration } from "@workspace/natlang/model";
import type {
  FailureCause,
  GitHubAccessLevel,
  NextStep,
  OnboardingStatus,
  Route,
} from "./types.js";

/** What `score` returns: the gates are a plain boolean record, whichever function the case exercises. */
type Metric = {
  quality: number;
  metrics?: Record<string, number>;
  gates: Record<string, boolean>;
  feedback: string;
};

/** One suite, three functions: each case names the function it exercises. */
type CaseInput =
  | { function: "accessLevelFor"; input: string }
  | {
      function: "githubSetupRoute";
      input: {
        status: OnboardingStatus;
        level: GitHubAccessLevel;
        recording: { credential: unknown };
      };
    }
  | { function: "troubleshootGithub"; input: string };
type CaseExpected =
  | GitHubAccessLevel
  | { action: Route["action"]; accessLevel?: GitHubAccessLevel }
  | FailureCause;

// Gates for porting (DECOMPOSITION.md): accessLevelFor and troubleshootGithub at least 0.85 accuracy on validation and
// on the locked test split; githubSetupRoute every case exact on validation and at least 0.85 on test.
export default defineEvaluationSuite<CaseInput, CaseExpected>({
  id: "github-v1",
  program: { root: ".", id: "github", entry: "natlang.ts" },
  components: "lambda-only",
  cases: "./cases.jsonl",
  models: { executor: "default" },
  executorIdentity: executorIdentityForChoice(loadModelConfiguration("default").choice),
  policy: { codeEdits: "deny", settings: { maxTurns: 6, turnTokens: 1024, contextTokens: 8192 } },
  budget: { maxRollouts: 80, maxProposals: 0, maxModelCalls: 1200 },
  fixture: {
    async create(testCase, context) {
      const app = (await context.loadFreshProgram()) as {
        githubSetupRoute: {
          collect(status: OnboardingStatus, level: GitHubAccessLevel): Promise<Route>;
          accessLevelFor(intent: string): Promise<GitHubAccessLevel>;
        };
        troubleshootGithub: { collect(failure: string): Promise<NextStep> };
      };
      const input = testCase.input;
      if (input.function === "accessLevelFor") {
        return {
          execute: () =>
            context.runtime.run(() => app.githubSetupRoute.accessLevelFor(input.input)),
        };
      }
      if (input.function === "troubleshootGithub") {
        return {
          execute: () => context.runtime.run(() => app.troubleshootGithub.collect(input.input)),
        };
      }
      // The stored credential's secret-free summary, as `credentials.resolveCredential` returns it.
      const services = {
        credentials: {
          async resolveCredential() {
            return input.input.recording.credential;
          },
        },
      };
      return {
        execute: () =>
          context.runtime.run(
            () => app.githubSetupRoute.collect(input.input.status, input.input.level),
            { services }
          ),
      };
    },
  },
  score(testCase, observation, outcome): Metric {
    const result = (observation as { result?: unknown }).result;
    const expected = testCase.expected!;
    if (testCase.input.function === "accessLevelFor") {
      const exact = outcome.kind === "returned" && result === expected;
      return {
        quality: exact ? 1 : 0,
        gates: { completed: outcome.kind === "returned", exact },
        feedback: exact
          ? "Correct."
          : `Expected ${expected}; got ${result ?? outcome.error?.outcome}.`,
      };
    }
    if (testCase.input.function === "troubleshootGithub") {
      const cause = (result as NextStep | undefined)?.cause;
      const exact = outcome.kind === "returned" && cause === expected;
      return {
        quality: exact ? 1 : 0,
        gates: { completed: outcome.kind === "returned", exact },
        feedback: exact
          ? "Correct."
          : `Expected ${expected}; got ${cause ?? outcome.error?.outcome}.`,
      };
    }
    const route = result as Route | undefined;
    const want = expected as { action: Route["action"]; accessLevel?: GitHubAccessLevel };
    if (outcome.kind !== "returned" || !route) {
      return {
        quality: 0,
        gates: { completed: false, exact: false },
        feedback: `No route: ${outcome.error?.message ?? "no result"}`,
      };
    }
    const action = route.action === want.action;
    const level = want.accessLevel === undefined || route.accessLevel === want.accessLevel;
    return {
      quality: action && level ? 1 : action ? 0.5 : 0,
      metrics: { action: Number(action), level: Number(level) },
      gates: { completed: true, exact: action && level },
      feedback: `action ${route.action} (want ${want.action}); access level ${route.accessLevel ?? "none"} (want ${want.accessLevel ?? "none"})`,
    };
  },
  feedback(testCase, result) {
    return { input: testCase.input.function, actual: result.outcome.value ?? null };
  },
});
