# Decomposition: GitHub setup route, access level, troubleshooting

Three functions, all over the skill's own helpers and the one read-only `credentials.resolveCredential`. The program is
a folder of its own (`skills/github/natlang`) because natlang compiles every `.ts` beside a `.nl`, and the skill's
`index.ts` imports `@workspace/runtime`.

## `accessLevelFor(intent): GitHubAccessLevel` (`githubSetupRoute/accessLevelFor.nl`)

Own function, `readout: decision`. The six levels are a literal union and the choice is a judgment over a sentence of
the user's words ("least access that lets it work"). The meaning of each level is `SETUP.md` and `SKILL.md`, stated once.
**Measured, below the gate, so the agent still names the level**; the function stays as a child
(`githubSetupRoute.accessLevelFor`) for the agent to consult and to seed adaptation.

## `githubSetupRoute(status, level): Route` (`githubSetupRoute.nl`)

| Part | Decision | Why |
|---|---|---|
| The onboarding stage rules: `error` is repair, `needs-token` renders `GitHubSetup.tsx`, `connected` verifies, `verified` proceeds | crisp, `githubSetupRoute/collect.ts` | Exact over an enum; the old skill's numbered workflow. |
| The stored credential's access level (`credentials.resolveCredential`, secret-free `metadata.accessLevel`) and whether it covers the needed one | crisp, `githubSetupRoute/covers.ts` | The coverage relation is exact over the fine-grained permission sets in `GITHUB_ACCESS_LEVELS` (`index.ts`); `index.test.ts` derives it from those and fails if the table drifts. Never decided by a model. |
| The exact component call to make next | crisp | Built from the level; the default `collaborate` needs no props. |
| Which level the user's goal needs | the agent's input (`level`) | An earlier version took the user's words and asked `accessLevelFor` inside the route; the executor misjudged 1 in 5 locked test cases, and a wrong level here sends the user to the wrong consent screen. The agent already holds the table of outcomes in `SKILL.md`. |
| Rendering the component, reading the token, verifying | stay with the agent | Effects (`inline_ui`, `requestGitHubTokenCredential`, a live `fetch`). The route is a proposal. No token or scope ever enters the program. |
| Carrier `githubSetupRoute.nl` | one instruction | `natlang.load` needs a `.nl`; agents call the exact child `route.collect(status, level)`. |

## `troubleshootGithub(failure): NextStep` (`troubleshootGithub.nl`)

| Part | Decision | Why |
|---|---|---|
| Name the cause of a failure text | own function `troubleshootGithub/cause.nl`, `readout: decision` | Free text in, six causes out; the cause definitions are `TROUBLESHOOTING.md`'s headings. |
| The steps for each cause | crisp data, `troubleshootGithub/steps.ts` | The documented fixes, one table. `TROUBLESHOOTING.md` points here. |

## Suite

One suite (`suite.ts`) and one case file (`cases.jsonl`) whose cases name the function they exercise: `accessLevelFor` 18
cases (9 train, 4 validation, 5 test), `githubSetupRoute` 16 (7, 4, 5), `troubleshootGithub` 16 (8, 4, 4). Intents are the
phrasings of the skill and of typical user requests; failure texts are those of `TROUBLESHOOTING.md` with realistic
variants; route cases are onboarding statuses with a recorded credential summary. The `credentials` fake returns the
recorded summary.

## Measurement

Executor: LFM3-1.7B Q8_0 on natlang's llama.cpp fork (b12068), CPU, decision readouts scored (`sessionDriver`), run
in-process with the suite's own cases, fixture and scorer. Gates: accuracy of at least 0.85 on validation and on the locked
test split (route: every case exact).

| Function | Split | Result | Gate |
|---|---|---|---|
| `accessLevelFor`, first instruction | validation (4) | 0.50: "state of my pull requests" read as `collaborate`; "add a GitHub Action" read as `collaborate` | not met |
| | test (5) | 0.80: "pull the upstream changes" read as `collaborate` | not met |
| `accessLevelFor`, second instruction (read-only and code-workflows definitions sharpened, written against the train split) | train (9) | 9 of 9 | |
| | validation (4) | 4 of 4 | met |
| | test (5), run once | 0.80: the same "pull the upstream changes" miss | not met (1 case in 5) |
| `accessLevelFor`, second instruction, the readout scores the object the model answers in (natlang `ee9bb0b22`, measured at `ceb346744`; plans/MODEL_FACING_CHANGES.md, 2026-11-13) | validation (4) | 4 of 4 | met |
| | test (5), run again | 0.80: the same "pull the upstream changes" miss, `collaborate` at 0.94 (`read-only` 0.03); the other four exact | not met (1 case in 5) |
| `githubSetupRoute` with the model-chosen level | validation (4), test (5) | 1.00, 1.00 | met |
| `githubSetupRoute`, crisp (this version) | validation (4), test (5) | 1.00, 1.00; no model call | met |
| `troubleshootGithub` | validation (4), test (4) | 1.00, 1.00 | met |

Through `pnpm natlang:eval` on the final tree: validation 12 of 12 cases (all three functions, quality 1.00), test 13 of 14 (0.93; the one miss is the `accessLevelFor` case above). Cold cost on this CPU: about 25 s per scored decision (a ~3.6k-token opening prefilled for each), so `troubleshootGithub`
costs one decision and `accessLevelFor` one.

Reference model (the agent's own): not measured; no agent-class model is available in the harness. The labels were
written by the author from `SKILL.md` and `SETUP.md`.
