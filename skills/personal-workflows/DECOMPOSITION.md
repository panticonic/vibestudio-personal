# Personal workspace workflows

The root selects the assigned memory, onboarding, and repository work and assembles typed reports. Personal source projections come from the capability owner and carry bounded evidence. The root does not write credentials, workspace settings, or Git remotes.

| Skill | Natlang stages | Caller responsibility |
| --- | --- | --- |
| Workspace memory | Frame a bounded search, inspect matches, separate source status from interpretation, select citations and resolve contradictions | Invoke scoped `memory.recall`. Retain exact source metadata. Verify original source records when a claim requires confirmation. |
| Onboarding | Interpret the user's goal, explain a capability owner's recorded state and choose the next conversational action | Read onboarding's live catalog and status adapters. Resolve a selection using the existing owner route. Render or execute the exact selected action on the owner surface. |
| GitHub | Interpret the requested repository operation, choose the least sufficient access, assess repository intent against exact status and produce a reversible work plan | Project non-sensitive Git and setup state from the existing workspace and Git status APIs. The established credential component verifies any remote or requests an upgrade. |

The onboarding status explanation uses the exact selected capability ID or owner route from the caller. Repository recommendations distinguish read-only inspection, local work, and remote effects. The workflow accepts known partial state and reports unresolved steps. Fixtures supply scoped input and exercise exact outcomes separately from the authored instructions.

## Product inputs

Use `personalSetupWorkflowInput` from the onboarding skill after an owner-state read. It accepts the `composeOnboardingCapabilities` readback and the existing `resolveOnboardingSelection` result. Use `personalRepositoryWorkflowInput` from the GitHub skill with product worktree and matching upstream observations. It projects the workspace owner's scope check without exposing stored credentials to the model.

Load `skills/personal-workflows/runPersonalWorkflow.nl` with the caller's `memory` binding when the requested work includes recall. A pure setup or repository plan requires no bound service. A composed workflow can use more than one Personal subtree in a single root invocation. Onboarding still owns rendering and the GitHub credential surface owns verification and access changes.

## Repository resumption

`resumeRepositoryWork` starts with a bounded local repository and GitHub
owner read. It delegates intent, minimum access, and worktree decisions to
the existing repository planner. A separate decision chooses whether the
plan needs a live onboarding route. Local changes take precedence over
credential work. The owner route is read only for an access or remote
verification blocker, using the product's setup or check action. The report
keeps the repository plan and the optional onboarding report together.
