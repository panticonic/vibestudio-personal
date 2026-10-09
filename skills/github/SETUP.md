# GitHub setup

Set up GitHub with the checked-in [GitHubSetup.tsx](GitHubSetup.tsx) component.
Render it with `inline_ui`; do not turn this document into a sequence of forms.

The component asks the user one question: what they want to do. It then
handles token type, permission prefill, browser choice, trusted credential
entry, and live verification itself, in the same persistent workflow. It does
not hand choices back for the agent to act on.

## Happy path

1. Choose an access outcome. **Work with code** is the recommended default.
2. Open GitHub either inside Vibestudio or in the user's normal browser.
3. On GitHub:
   - keep the generated token name or replace it;
   - choose an expiration;
   - choose selected repositories or all repositories;
   - review the prefilled permissions;
   - generate the token.
4. Return to the setup surface and choose **I created the token — save it**.
5. Enter the token only in Vibestudio's trusted credential prompt.
6. The component verifies the stored credential with a live GitHub user
   request.

Never ask the user to paste a token into chat, a feedback field, or
panel-owned React state.

## What the access choices mean

- **Look around**: view repository content and collaboration activity, and
  clone or pull code.
- **Work with code**: make code changes, push, and work with issues and pull
  requests.
- **Publish repositories**: create repositories, push code, and collaborate on
  issues and pull requests. This adds GitHub's repository **Administration:
  write** permission, which GitHub's repository-creation API requires.
- **Publish websites**: create a repository, push website source, and configure
  GitHub Pages. Site visibility is reviewed separately. See [PAGES.md](PAGES.md).
- **Edit Actions too**: work with code and change GitHub Actions workflow
  files.
- **Full GitHub access**: request the broadest supported repository
  permissions. This is not the default.

Under the hood this is a fine-grained GitHub personal access token. Don't
mention the term unless the user asks or GitHub's page needs explaining.

## Browser actions

- **Open here** uses a Vibestudio browser panel; good for guided setup.
- **Open in my browser** uses the system browser; good for existing GitHub
  sessions, passkeys, and password managers.

Both call `openGitHubTokenSettings()` and use the same approval for the GitHub
destination. If you opened an internal panel only for setup, close it once the
user is done with it.

The setup surface can preselect an organization owner with GitHub's
`target_name` URL parameter. The selected owner is also saved in the credential
metadata. When publishing, that saved owner is the default repository owner, so
an organization-targeted token works without passing the organization again.
The user must be a member of the organization, and organization policy or
approval may still apply.

To publish somewhere other than the saved token owner, pass the organization
separately from the repository name:

```ts
await publishToGitHub({
  repoPath: "projects/my-project",
  name: "my-project",
  organization: "my-org",
});
```

When `organization` is omitted, both `publishToGitHub()` and the lower-level
`git.publishRepo()` use the saved PAT owner if the selected credential has one,
and otherwise the authenticated GitHub user. An explicit organization must match
that owner, so a token targeted at one organization can't silently try to
publish into another. If several GitHub credentials are active, pass
`credentialId`; neither function guesses. Both check the credential and publish
permission live before creating anything. Publishing an organization repository
uses GitHub's organization repository API and Git HTTPS separately. Credentials
created before organization API support are upgraded automatically at request
time; the user doesn't need to reconnect for that reason.

## Advanced token cases

Use these only for a concrete requirement or failure:

- A classic token is a legacy broad-scope fallback. Use `tokenKind: "classic"`
  only when the user asks for it or the operation cannot work with a
  fine-grained token.
- Fine-grained tokens cannot do every GitHub operation. Checks API writes need
  a GitHub App.
- Explicit `mode`, permission presets, and raw scopes are for narrowly specified
  workflows; don't ask about them during onboarding.

Classic fallback:

```ts
await openGitHubTokenSettings({
  tokenKind: "classic",
  accessLevel: "broad",
  browser: "external",
});

const stored = await requestGitHubTokenCredential({
  tokenKind: "classic",
  accessLevel: "broad",
});
```

## Verification

```ts
const verification = await verifyGitHubCredential(credentialId);
if (!verification.valid) {
  // Use TROUBLESHOOTING.md with the concrete failure.
}
```

For clone or pull access to a known remote:

```ts
await verifyGitHubGitRemoteAccess(
  "https://github.com/owner/repository.git",
  credentialId,
);
```

A stored credential is not a verified one. Don't report onboarding complete just
because the credential was saved. Call
`getGitHubOnboardingStatus({ verify: true })`; its `completedAt` field marks
completion for the agent and comes with the verified credential and token owner.
