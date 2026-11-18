---
description: Resolve evidence status and name source records that need confirmation.
args:
  request: PersonalMemoryRequest
  evidence: PersonalMemoryHit[]
  claims: PersonalMemoryClaim[]
returns:
  {status: PersonalMemoryStatus; verify: string[]}
---
If no claim has evidence, return no-evidence. If relevant records disagree on the same proposition, return conflicting. Separate conversation-only claims from a committed source. If the user wants current status and available sources are only old decisions or superseded text, return historical. Use corroborated when independent evidence agrees on the scoped proposition. Use single-source for a current relevant committed record that has no independent corroboration. Return the original source locations to verify, using dates only as available from the records.
