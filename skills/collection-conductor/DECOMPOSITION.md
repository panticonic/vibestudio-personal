# Live collection conductor

The caller owns a collection root. The workflow walks that subtree and
resolves requests to stable panel IDs. A title alone can be ambiguous across
branches. An ambiguous or absent reference is held and reported. The workflow
can continue with subsequent independent requests.

| Responsibility | Natlang stages | Runtime adapter |
| --- | --- | --- |
| Discover the current collection | Start from the assigned root and use a fresh walk after each effect. | Walk the real panel tree within the caller's budget and read its persisted notes. |
| Interpret user intent | Resolve titles and optional parent names. Plan a rename, note edit, nested collection or move relative to a sibling. | Check the observed basis and enforce scope and structural preconditions. |
| Confirm each change | Verify titles and notes separately from group placement and ordering. | Read real state after the SDK operation. |
| Handle ambiguity | Hold missing, ambiguous and structurally impossible requests with the current evidence. | Reject scope escapes, cycles and stale writes at the boundary. |

Title and note verification uses the complete ordered snapshots. A TypeScript
comparison allows only the assigned field to differ and preserves each
panel's identity, parent, context, source, and other field. The Natlang
reviewer returns an unverified finding if that comparison fails.
