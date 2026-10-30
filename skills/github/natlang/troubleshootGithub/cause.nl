---
description: Name the cause of a GitHub failure.
readout: decision
args:
  failure: string
returns: FailureCause
---
Name the cause of failure, the status and message GitHub or the setup helpers returned.

- bad-credentials: the token is wrong, expired or revoked: "401 Bad credentials".
- missing-permission: GitHub knows the token but it lacks a repository or permission for this request: "403 Resource
  not accessible by personal access token".
- org-approval: the repository belongs to an organization that has not approved the token, or has not granted it
  access: a private organization repository that answers 403 or 404 although the token owner is a member.
- audience-mismatch: "credential-audience-mismatch": the publish path could not bind the credential to GitHub's account
  API or Git HTTPS address.
- publish-preflight: "GitHub publish preflight failed": publishing a repository was refused before anything was created.
- unknown: none of these.
