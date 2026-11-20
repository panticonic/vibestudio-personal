---
description: Join current local and owner approval evidence into the exact next route.
args:
  access: GitHubAccessLevel
  local: 'GitHubOpenRoute | null'
  preflight: 'GitHubOpenPreflight | null'
  setup: 'GitHubSetupReport | null'
returns: GitHubOpenDecision
---
1. Keep an actual local decision first, with no profile or approvals. For an ambiguous preflight or wrong owner, choose choose-account.
2. For a bound profile, retain only the IDs from this owner in preflight.profile.retained, in their observed order. Copy its current approval ID. The current owner decision takes precedence over a previously approved record. Denied, pending, or expired requires wait-for-owner. Partial approval needs request-scoped-access.
3. For an unreadable profile or a native setup repair route choose repair-account. For a saved, unverified credential choose verify-account. For unconnected or render-setup without a profile use offer-setup and explain whether the interactive owner surface is available. For a scoped permission/binding gap or a native setup upgrade choose request-scoped-access.
4. Only an available approved profile and a native proceed route permits ready-for-owner. This means the requested next step can be reviewed by the owner. Return the exact access, selected profile ID, current and retained approval IDs, and a concrete reason grounded in the actual result.
