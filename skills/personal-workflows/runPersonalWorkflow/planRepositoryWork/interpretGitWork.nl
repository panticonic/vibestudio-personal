---
description: Identify the concrete Git operation and whether the requested scope is ambiguous.
args:
  goal: string
returns:
  {operation: PersonalRepoAction; ambiguous: boolean}
---
Interpret the user's requested action. Looking at a diff or checking status is inspect. Fetching upstream changes into a working branch is pull. Changing local files is edit-local. Updating the remote branch is push. Creating a new remote repository, publishing Pages, and editing workflow files are distinct intents. If no concrete operation can be established, mark ambiguous and use inspect.
