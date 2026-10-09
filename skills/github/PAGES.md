# Publish a workspace-enabled website

Use the existing GitHub setup, semantic VCS, and Git Bridge. Pages adds a public
website to a repository; it does not give that site any workspace credentials.
The same App component and portable runtime work both in an installed panel and
in a connected website. See [website development](../workspace-dev/WEBSITES.md).

## Build and review

Use the Host developer scaffold to vendor a pinned standalone SDK:

```sh
pnpm build:website-runtime --out-dir /tmp/website-sdk
pnpm create:website --out-dir /tmp/my-website --sdk-dir /tmp/website-sdk --name my-website
cd /tmp/my-website
npm ci
npm run build
```

The public output is `docs/`, with relative asset URLs, `.nojekyll`, and the
content-hashed build manifest. Review the generated source and output together,
including the SDK artifact and lockfile. Test normal browsing under a project
path such as `/my-website/`, then test connecting and denying access in
Vibestudio. These are Host commands; do not present them as workspace eval
exports.

Bring the reviewed repository into its own managed project through normal
workspace authoring or import, then commit and publish it to protected main
through [Vibestudio VCS](../vibestudio-vcs/SKILL.md). Review every public file in
the repository, not only `docs/`: a public repository also exposes its source
and Git history. Keep the reviewed `mainEventId` and the build manifest's
`buildId`. Credentials, workspace transcripts, and private source must not go
into this public repository.

## Connect GitHub and publish the repository

Use `GitHubSetup` from the [GitHub skill](SKILL.md) and select **Publish
websites** (`publish-pages`). The component handles the account, repository
access, and any repair; never ask for tokens in chat. Keep the credential ID it
returns for the steps below.

Call the existing `publishToGitHub` helper with an explicit repository name,
visibility (`private`), and `expectedMainEventId`. The event ID is checked at
the moment protected source is exported. Unrelated workspace configuration
changes are allowed; if the repository contents changed, review the new source
before trying again.

```ts
import { publishToGitHub } from "@workspace-skills/github";

const published = await publishToGitHub({
  repoPath: "projects/my-website",
  name: "my-website",
  private: false,
  credentialId,
  expectedMainEventId: reviewedMainEventId,
});
```

Publication is resumable. If a step fails or its result is lost, fix the
reported cause and call `publishToGitHub` again with the same input: it finds
the repository it already created, keeps the recorded remote, and pushes only
what is missing. Calling it again after success returns the same publication
record (`owner`, `branch`, `headCommit`). A different name for an already
published repository path is refused. Never force-push to make publication
succeed.

## Enable and verify Pages

Use the repository name chosen above and the owner, branch, and commit that
`publishToGitHub` returned; never guess a deployed URL from a title or
username.

```ts
import {
  enableGitHubPages,
  observeGitHubPages,
} from "@workspace-skills/github";

if (!published.pushed || !published.headCommit)
  throw new Error("Finish Git push first");
const publication = {
  owner: published.owner,
  repository: "my-website",
  branch: published.branch,
  commit: published.headCommit,
  buildId: reviewedBuildId,
};
const observation = await enableGitHubPages(publication, { credentialId });
```

This configures the existing branch's `/docs` source. It refuses to replace an
existing workflow or a different Pages source. Repository-scoped Pages access
uses the same credential system as GitHub setup. A permission failure returns
the limited `publish-pages` repair choice; a denial never escalates to broader
access.

Only `state: "deployed"` means verification succeeded: the GitHub build must
match the recorded commit, and the public manifest and every listed asset must
match the recorded build. `building`, `failed`, `unverified`, and
`not-configured` are separate results. Show their reason when there is one.

Call `observeGitHubPages(publication, { credentialId })` again to follow an
uncertain or pending deployment. Observing creates nothing and changes no
configuration. If configuration itself was interrupted, retry
`enableGitHubPages` with the same record; it recognizes a request that already
succeeded.

## Update

Build, review, and publish the changed source to protected main. Push with
`git.pushUpstream(repoPath, { expectedMainEventId: reviewedMainEventId })`, keep
the returned `headCommit` together with the new `buildId`, then observe that
record. Keep automatic upstream push disabled for this reviewed workflow. Do not
rebuild or create another repository just because Pages is still building.

GitHub project paths under one owner domain share a web origin. Remembered
workspace access applies to the whole origin, not just one repository path. A
website that needs its own trust identity needs its own custom origin.

Live public deployment and iOS connection still have to be verified in their
real environments; local builds and mocked API tests do not prove them.
