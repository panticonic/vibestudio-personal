---
name: github
description: Connect GitHub, choose access level, use GitHub APIs, clone repos, or sync managed repos through Git Bridge.
---

# GitHub

## Connection workflow

GitHub setup is a single workflow run by the setup component, not a
questionnaire.

1. Call `getGitHubOnboardingStatus()` from `@workspace-skills/github`, choose the
   access level the user's goal needs (see the choices below), and ask
   `routeGitHubSetup` what to do next. It applies the setup rules to the status
   and its stored credential; nothing in it needs a model.

   ```ts
   import { getGitHubOnboardingStatus, routeGitHubSetup } from "@workspace-skills/github";
   return routeGitHubSetup(await getGitHubOnboardingStatus(), "collaborate");
   ```

   `next.action` is one of `render-setup`, `verify`, `proceed`, `repair`;
   `next.next` is the exact call to make; `next.reason` is a sentence for the
   user. A verified credential whose access level does not cover the goal comes
   back as `render-setup` with the higher level, so the user upgrades instead
   of hitting a 403 later.
2. For `render-setup`, render the component with the props the route gives:

   ```text
   inline_ui({ path: "skills/github/GitHubSetup.tsx", props: {} })
   ```

3. The component opens GitHub, requests the credential through the host,
   verifies it, and shows success or a repair state.
4. Before cloning or pulling a specific Git remote, call
   `verifyGitHubGitRemoteAccess(remoteUrl, credentialId)`.

When the website-publishing workflow asks for GitHub Pages access, the same
route returns `publish-pages`; render the same component with
`props: { accessLevel: "publish-pages" }`. This preselects
the **Publish websites** option; it is not a separate credential workflow.

Never collect tokens, scopes, repository selections, or browser choice in chat.
The component handles those choices and calls `requestGitHubTokenCredential()`,
so secrets never enter workspace code or component state. If the user denies or
cancels, stop.

Without `inline_ui`, explain that setup needs an interactive Vibestudio panel.
Don't recreate it as a series of questions.

## Access outcomes

Use the component's plain-language access choices instead of explaining token
terminology. Choose by the goal: `read-only` to look and clone, `collaborate` for
repo work, `publish` for creating repos, `publish-pages` for websites,
`code-workflows` for changing workflow files, and `broad` only when the user
explicitly asks. A small model can help with this choice:
`natlang.load("skills/github/natlang/accessLevelFor.nl")` takes the user's goal.
It matched 4 of 5 locked test cases and misread "pull the upstream changes" as
`collaborate`, so confirm its answer. Classic tokens are covered in
[SETUP.md](SETUP.md).

When verification or a Git operation fails, ask the typed troubleshooter with the
status and message exactly as returned. It names the cause and returns the
documented steps; [TROUBLESHOOTING.md](TROUBLESHOOTING.md) explains each cause.

```ts
const troubleshoot = await natlang.load("skills/github/natlang/troubleshootGithub.nl");
const step: NextStep = await troubleshoot.collect("403 Resource not accessible by personal access token");
return step; // { cause: "missing-permission", steps: [...] }
```

Read `index.ts` for the current helper exports and parameter types. Don't copy
its permission mappings into another workflow.

## Repository work

- Call GitHub APIs with `credentials.fetch()`.
- Use `@vibestudio/git` with `credentials.gitHttp()` for unmanaged checkouts.
- Use the runtime `git` provider for managed workspace repos. Never treat the
  server's Git checkout as source.
- Pass `credentialId` when more than one credential is active; don't guess an
  account or organization.

Publishing a managed repo takes two steps: publish the working state through
[Vibestudio VCS](../vibestudio-vcs/SKILL.md), then export protected main to
GitHub. Pulling from GitHub returns an unpublished semantic candidate that you
compare and integrate like any other change.

Read [Git Bridge](../../extensions/git-bridge/SKILL.md) for upstream status,
pull, push, divergence, credentials, and provider publication. Don't
reimplement that sync logic here.

## Websites

For building, source review, Git publication, Pages configuration, and read-only
deployment recovery, read [GitHub Pages](PAGES.md). Use the existing
`publish-pages` access choice and keep the commit/build receipt.

## Personal workflow composition

`personalRepositoryWorkflowInput` projects caller-read worktree, GitHub scope,
and matching upstream status into the repository planning branch of the
[Personal Natlang workflow](../personal-workflows/runPersonalWorkflow.nl). Its plan can
follow a workspace memory or setup question in the same invocation.
