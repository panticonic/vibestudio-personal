---
description: Identify which owner-reported capabilities matter and which states remain uncertain.
args:
  request: PersonalSetupRequest
returns:
  {capabilityIds: string[]; unknownIds: string[]}
---
Use capability IDs supplied by the caller. For a valid selection, keep the selected capability. For welcome or refreshed view, include relevant owner rows and keep unknown or unavailable rows visible as unknown IDs. Do not reinterpret an owner state as an effect grant.
