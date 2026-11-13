---
description: Choose the GitHub access level a user's request needs.
readout: decision
args:
  intent: string
returns: GitHubAccessLevel
budget: { turnTokens: 1024 }
---
Choose the access level for intent, what the user wants to do with GitHub. Pick the least access that lets it work.

- read-only: the user wants to see or ask about something: view, list, read, summarize, or check the state or status
  of repositories, issues, pull requests, reviews or Actions runs; clone or pull. Nothing is changed. A question about
  a pull request or an issue is read-only.
- collaborate: change something in an existing repository: push branches, open or update pull requests, create or
  comment on issues, merge. This is the level for ordinary repository work.
- publish: create a new repository, or put a local project on GitHub for the first time.
- publish-pages: put a website online with GitHub Pages.
- code-workflows: the work is on GitHub Actions: add, change or fix a workflow, a CI or CD pipeline, or an "Action"
  (the files in .github/workflows).
- broad: only when the user explicitly asks for full, unrestricted or everything access.
