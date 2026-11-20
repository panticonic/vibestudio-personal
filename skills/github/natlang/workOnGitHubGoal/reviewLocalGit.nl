---
description: Decide whether the observed checkout must be protected before account work.
args:
  goal: string
  intent: GitHubOpenIntent
  local: GitHubLocalView
returns: 'GitHubOpenRoute | null'
---
1. For a local-only report, return report-local.
2. For an existing repository, a missing, invalid or wrong-owner remote requires repair-remote. If the user is preparing a new repository or site, a missing remote is expected. An existing invalid or mismatched remote still requires review before reuse.
3. Before work that changes code or publishes, protect uncommitted, staged or detached work with preserve-local-work. Existing tracked history behind or diverged from the local branch needs integrate-local-history before upload. An ahead-only branch with no changes remains eligible for account review.
4. Otherwise return null to continue with owner and capability checks. Never write Git config, fetch, reset or publish.
