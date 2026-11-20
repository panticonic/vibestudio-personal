---
description: Leave the owner's requested durable local handoff after checking the current evidence.
args:
  revision: string
  decision: GitHubOpenDecision
returns: 'GitHubOpenHandoff | null'
---
Call openGitHubWork.stage with the current revision and actual decision. Return the exact receipt returned by that service, including null for a held stage.
