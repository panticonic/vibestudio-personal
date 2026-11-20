---
description: Choose the next step appropriate to the current surface and the actual setup route.
args:
  route: GitHubSetupReceipt
  interactive: boolean
returns: GitHubSetupHandoff
---
For render-setup return offer-setup if the caller provides an interactive surface and interactive-required otherwise. For verify, repair, or proceed return the matching handoff for that action. A proposal to open setup does not establish a connection.
