# Prepare live onboarding

The setup overview is a presentation of capability-owner state. The caller
binds the snapshot reader and the original user interaction. The Natlang
workflow plans the response from that receipt.

- `observeSetup/readOwnerSnapshot` obtains the exact scoped rows and resolved
  selection. The ordinary onboarding product code reads the installed catalog
  and current owners; no explicit remote credential check is requested.
- `reviewSelection` checks whether the action belongs to a registered owner,
  page, panel, or shell destination. Unknown or retired actions are held.
- `reviewOwnerState` explains observed readiness in terms of evidence. Optional
  capabilities do not count toward completion. An unread row stays unknown.
- `planSetup` preserves the exact rows and canonical route. It distinguishes
  a refreshed overview from navigation to a new workspace. The caller owns
  dispatch, so this operation returns a plan.
