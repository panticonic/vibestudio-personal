---
description: Record preserved state, an authorization hold, or exact monitor absence.
args:
  queue: Queue
  name: string
  id: string | null
  status: string
returns: Finding
---
Match the given ID to an actual monitor when present. Use the exact live name, state, revision and reviewed revision, or the requested name and null values when the monitor is absent. Use the given status and current observation ID as evidence.
