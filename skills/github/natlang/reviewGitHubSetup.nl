---
description: Determine how the user's GitHub request can proceed from the actual connection status in this workspace.
uses: [accessLevelFor]
args:
  request: GitHubSetupRequest
returns: GitHubSetupReport
---
1. Call readGitHubSetup with request.operationId and keep its actual status.
2. Call accessLevelFor with request.goal. Call resolveGitHubRoute with the same operationId and the chosen access level.
3. Call chooseSetupHandoff with the native route and request.interactive. Return the status, accessLevel, route and handoff unchanged. This review prepares the handoff. It does not verify or change a credential or act on a repository.
