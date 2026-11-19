---
description: Check that the requested project, dependencies or work state is the only planning change.
args:
  before: MissionCard
  after: MissionCard
  changes: MissionChanges
returns: boolean
---
For relocate require the new project ID and preserve dependencies and status. For prerequisites preserve project ID and status and require the exact ordered dependency IDs. For ready require status ready and preserve project and dependencies. Compare dependencies by value and order.
