# Decomposition: GitHub access level and troubleshooting

Two functions. The program is a folder of its own (`skills/github/natlang`) because natlang compiles every `.ts` beside a
`.nl`, and the skill's `index.ts` imports `@workspace/runtime`.

The setup route (which step of connecting GitHub comes next, and whether the stored credential covers the level the goal
needs) is exact code with no model call, so it is not a natlang function: it is `routeGitHubSetup` in the skill's
`index.ts`, next to the onboarding status it reads.

## `accessLevelFor(intent): GitHubAccessLevel` (`accessLevelFor.nl`)

Own function, `readout: decision`. The six levels are a literal union and the choice is a judgment over a sentence of
the user's words ("least access that lets it work"). The meaning of each level is `SETUP.md` and `SKILL.md`, stated once.
**Measured, below the gate, so the agent still names the level**; the function stays for the agent to consult and to seed
adaptation. The agent's own choice of level is what `routeGitHubSetup` takes.

## `troubleshootGithub(failure): NextStep` (`troubleshootGithub.nl`)

| Part | Decision | Why |
|---|---|---|
| Name the cause of a failure text | own function `troubleshootGithub/cause.nl`, `readout: decision` | Free text in, six causes out; the cause definitions are `TROUBLESHOOTING.md`'s headings. |
| The steps for each cause | crisp data, `troubleshootGithub/steps.ts` | The documented fixes, one table. `TROUBLESHOOTING.md` points here. |

## Suite

One suite (`suite.ts`) and one case file (`cases.jsonl`) whose cases name the function they exercise: `accessLevelFor` 18
cases (9 train, 4 validation, 5 test), `troubleshootGithub` 16 (8, 4, 4). Intents are the phrasings of the skill and of
typical user requests; failure texts are those of `TROUBLESHOOTING.md` with realistic variants.

## Measurement

Executor: LFM3-1.7B Q8_0 on natlang's llama.cpp fork (b12068), CPU, decision readouts scored (`sessionDriver`), run
in-process with the suite's own cases, fixture and scorer. Gates: accuracy of at least 0.85 on validation and on the locked
test split.

| Function | Split | Result | Gate |
|---|---|---|---|
| `accessLevelFor`, first instruction | validation (4) | 0.50: "state of my pull requests" read as `collaborate`; "add a GitHub Action" read as `collaborate` | not met |
| | test (5) | 0.80: "pull the upstream changes" read as `collaborate` | not met |
| `accessLevelFor`, second instruction (read-only and code-workflows definitions sharpened, written against the train split) | train (9) | 9 of 9 | |
| | validation (4) | 4 of 4 | met |
| | test (5), run once | 0.80: the same "pull the upstream changes" miss | not met (1 case in 5) |
| `accessLevelFor`, second instruction, the readout scores the object the model answers in (natlang `ee9bb0b22`, measured at `ceb346744`; plans/MODEL_FACING_CHANGES.md, 2026-11-13) | validation (4) | 4 of 4 | met |
| | test (5), run again | 0.80: the same "pull the upstream changes" miss, `collaborate` at 0.94 (`read-only` 0.03); the other four exact | not met (1 case in 5) |
| `troubleshootGithub` | validation (4), test (4) | 1.00, 1.00 | met |

Through `pnpm natlang:eval` on the final tree: validation 12 of 12 cases (all three functions, quality 1.00), test 13 of 14 (0.93; the one miss is the `accessLevelFor` case above). Those totals include the route cases, now exercised as ordinary tests of `routeGitHubSetup` in `../index.test.ts`. Cold cost on this CPU: about 25 s per scored decision (a ~3.6k-token opening prefilled for each), so `troubleshootGithub`
costs one decision and `accessLevelFor` one.

Reference model (the agent's own): not measured; no agent-class model is available in the harness. The labels were
written by the author from `SKILL.md` and `SETUP.md`.
