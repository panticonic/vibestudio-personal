---
description: Diagnose the assigned GitHub operation using the actual local preflight and its installed setup route.
uses: [troubleshootGithub, reviewGitHubSetup]
args:
  request: GitHubDiagnosisRequest
returns: GitHubDiagnosisReport
---
1. Call readGitHubDiagnosis with request.operationId. Keep its exact observation.
2. If the observation has a failure, call troubleshootGithub with the failure. Otherwise return null diagnosis.
3. When the diagnosis is not-connected and the observation contains a setup assignment, call reviewGitHubSetup with that exact assignment. Otherwise return null setup. Return the observation, diagnosis, and setup. This is a local preflight review.
