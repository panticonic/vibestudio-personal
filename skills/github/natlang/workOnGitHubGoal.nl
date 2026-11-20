---
description: Review live local Git and owner-bound GitHub setup for the user's goal.
uses: [accessLevelFor, reviewGitHubSetup, troubleshootGithub]
args:
  goal: string
returns: OpenGitHubReport
budget: { maxTurns: 24 }
---
1. Call openGitHubWork.discover and chooseGitHubIntent with the unchanged goal. Resolve a real repository from that catalog. Call openGitHubWork.inspect with its observed catalog revision and exact repository ID. If unavailable, return unresolved.
2. Call accessLevelFor with the user's goal to choose the minimum requested access. Call reviewLocalGit with the goal, intent, and exact local view. If it recommends a local hold or local-only review, omit the provider preflight and setup. When the reason is an invalid remote, use troubleshootGithub with "Invalid GitHub remote URL for local verification." as the factual diagnosis.
3. If the local step permits account review, call openGitHubWork.preflight with the actual view ID, intent and access. Call reviewGitHubSetup with that preflight's exact setup request only when it supplies one; otherwise keep setup null. Use troubleshootGithub on the exact preflight failure only for missing connection, permission, or an unavailable account. Keep the actual returned evidence.
4. Call chooseGitHubDecision with access, the actual local disposition, preflight, and setup. If the user explicitly asked to stage a handoff, call stageGitHubHandoff, passing the actual preflight ID when present or the local view ID otherwise. For advice alone, leave handoff null. Return status reviewed with the exact local, intent, preflight, setup, diagnosis, decision and handoff.
