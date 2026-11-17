import { defineEvaluationSuite } from "@workspace/natlang/evaluation";
import {
  executorIdentityForChoice,
  loadModelConfiguration,
} from "@workspace/natlang/model";
import type { CitedFacts } from "./types.js";

// The executor's production call budget (Base model-catalog MODEL_ROLE_CALL_BUDGETS.executor): the gates measure the
// bounds the program runs under. A suite cannot import workspace source, so it is restated here.
const EXECUTOR_BUDGET = { maxTurns: 12, maxTokens: 16384 };

type Result = {
  kind: string;
  snippet: string;
  where: string;
  appendedAt: string | null;
  path: string | null;
  eventId: string | null;
};
type CaseInput = { query: string; results: Result[]; asOf: number };
type CaseExpected = {
  /** Each entry is a fact the summary must state: any one of its alternatives appears in some fact. */
  facts: string[][];
  conflict: boolean;
  nothingFound: boolean;
  old?: boolean;
  messageOnly?: boolean;
  singleSource?: boolean;
  /** Some fact cites more than one snippet. */
  merged?: boolean;
  /** Words that appear only in distractor snippets and must not appear in any fact. */
  forbid: string[];
};

/**
 * Snippets are real commit messages of this repository and excerpts of its files, plus conversation messages written
 * for the cases (no transcript is recorded). The age caveat compares against the case's fixed invocation snapshot.
 */
const recordedMemory = (input: CaseInput) => ({
  async recall() {
    return { results: input.results.map((result) => ({ ...result })) };
  },
});

// Gates for porting (DECOMPOSITION.md): quality of at least 0.85 on validation and on the locked test split, and every
// fact tied to evidence ids that the result lists (checked exactly in every case).
export default defineEvaluationSuite<CaseInput, CaseExpected>({
  id: "recall-summary-v1",
  program: { root: ".", id: "recall-summary", entry: "natlang.ts" },
  components: "lambda-only",
  cases: "./cases.jsonl",
  models: { executor: "default" },
  executorIdentity: executorIdentityForChoice(
    loadModelConfiguration("default").choice,
  ),
  policy: {
    codeEdits: "deny",
    settings: EXECUTOR_BUDGET,
  },
  budget: { maxRollouts: 40, maxProposals: 0, maxModelCalls: 1500 },
  fixture: {
    async create(testCase, context) {
      const app = (await context.loadFreshProgram()) as {
        recall(query: string, asOf: number): Promise<CitedFacts>;
      };
      const services = { memory: recordedMemory(testCase.input) };
      return {
        execute: () =>
          context.runtime.run(() => app.recall(testCase.input.query, testCase.input.asOf), {
            services,
          }),
      };
    },
  },
  score(
    testCase,
    observation,
    outcome,
  ): {
    quality: number;
    metrics?: Record<string, number>;
    gates: Record<string, boolean>;
    feedback: string;
  } {
    const result = (observation as { result?: CitedFacts }).result;
    const expected = testCase.expected!;
    if (outcome.kind !== "returned" || !result) {
      return {
        quality: 0,
        gates: { completed: false, cited: false },
        feedback: `No summary: ${outcome.error?.message ?? "no result"}`,
      };
    }
    const ids = new Set(result.evidence.map((snippet) => snippet.id));
    const cited = result.facts.every(
      (fact) =>
        fact.evidence.length > 0 && fact.evidence.every((id) => ids.has(id)),
    );
    const text = result.facts
      .map((fact) => fact.text.toLowerCase())
      .join(" \n ");
    const covered = expected.facts.filter((alternatives) =>
      alternatives.some((term) => text.includes(term.toLowerCase())),
    ).length;
    const coverage =
      expected.facts.length === 0 ? 1 : covered / expected.facts.length;
    const clean = expected.forbid.every(
      (term) => !text.includes(term.toLowerCase()),
    );
    const has = (kind: string) =>
      result.facts.some((fact) =>
        fact.caveats.some((caveat) => caveat.kind === kind),
      );
    const caveatsRight =
      has("conflicts") === expected.conflict &&
      (expected.old === undefined || has("old") === expected.old) &&
      (expected.messageOnly === undefined ||
        has("message-only") === expected.messageOnly) &&
      (expected.singleSource === undefined ||
        has("single-source") === expected.singleSource) &&
      (expected.merged === undefined ||
        result.facts.some((fact) => fact.evidence.length > 1) ===
          expected.merged);
    const empty = result.nothingFound === expected.nothingFound;
    const quality =
      clean && empty ? 0.6 * coverage + 0.4 * Number(caveatsRight) : 0;
    return {
      quality,
      metrics: {
        coverage,
        caveats: Number(caveatsRight),
        clean: Number(clean),
        facts: result.facts.length,
      },
      gates: { completed: true, cited, clean },
      feedback: `${result.facts.length} facts, covered ${covered}/${expected.facts.length}, caveats ${caveatsRight ? "right" : `wrong (${result.facts.flatMap((fact) => fact.caveats.map((caveat) => caveat.kind)).join(",") || "none"})`}, nothingFound ${result.nothingFound}.`,
    };
  },
  feedback(testCase, result) {
    return {
      input: { query: testCase.input.query },
      actual: result.outcome.value ?? null,
    };
  },
});
