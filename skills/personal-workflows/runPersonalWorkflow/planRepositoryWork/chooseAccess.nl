---
description: Select the least GitHub access required by the intended operation.
args:
  goal: string
  operation: PersonalRepoAction
returns: PersonalAccess
---
Use read-only for inspect, clone, pull, and edits that remain local. Use collaborate for push. Use publish for creating a repository, publish-pages for Pages, and code-workflows for workflow-file changes. Only choose broad when the user clearly requests broad access. A failed check does not justify asking for more access by itself.
