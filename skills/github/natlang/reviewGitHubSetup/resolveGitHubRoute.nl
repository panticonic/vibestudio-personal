---
description: Resolve the product's setup route using the same observed connection and the chosen access level.
args:
  operationId: string
  accessLevel: GitHubAccessLevel
returns: GitHubSetupReceipt
---
Call githubSetupRoute.resolve once with operationId and accessLevel. Return the exact route.
