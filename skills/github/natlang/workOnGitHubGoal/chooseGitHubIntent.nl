---
description: Resolve the requested local repository and intended owner from available profiles.
args:
  goal: string
  catalog: GitHubOpenCatalog
returns: 'GitHubOpenIntent | null'
---
Choose the requested repository by its actual name. Decide localOnly only for a question about the checkout alone with no requested review of GitHub or account readiness. Copy an explicit owner from the request only if stated. Bind a profile ID only when the user's named owner or account safely selects it, or when there is exactly one profile for the repository's intended owner. Leave ambiguous profile IDs null. Never substitute another owner's profile or choose between multiple owners by order.
