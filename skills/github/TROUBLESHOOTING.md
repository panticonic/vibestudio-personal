# GitHub Troubleshooting

## Verification Fails

- `401 Bad credentials`: regenerate the token and save it again.
- `403 Resource not accessible by personal access token`: in GitHub, add
  repository access or the missing fine-grained permission.
- Organization repositories may need organization approval for fine-grained PAT
  access.
- `credential-audience-mismatch`: the publish path could not bind the selected
  credential to GitHub's account API or Git HTTPS audience. Retry with the
  credential ID returned by onboarding, or omit `credentialId` so the runtime
  picks the connected GitHub credential.
- `GitHub publish preflight failed`: reconnect with the **Publish
  repositories** access level. It needs `contents: write`, repository
  `Administration: write`, and both GitHub API and Git HTTPS bindings.

## Git Clone Or Push Is Needed

Create the PAT with an access level that fits the task:

- `requestGitHubTokenCredential({ accessLevel: "read-only" })` for clone and
  pull
- `accessLevel: "collaborate"` for push
- `accessLevel: "publish"` when the workflow must create a repository

Creating a repository needs GitHub's fine-grained **Administration: write**
repository permission. Creating one in an organization also needs membership
and approval under the organization's policy. Lower-level agent flows can still
pass `mode: "git"` or `mode: "api-and-git"`. Verify a specific remote with
`verifyGitHubGitRemoteAccess(remoteUrl, credentialId)`.

For direct clone, pull, push, or fork workflows, use `@vibestudio/git` with
`credentials.gitHttp()` so the PAT is never exposed to panels or workers.
