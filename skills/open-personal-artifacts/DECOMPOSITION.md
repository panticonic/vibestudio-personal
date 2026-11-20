# Open goals for Personal reference artifacts

Personal's Browser Data extension supplies persisted bookmarks and history through
the owner-bound runtime port. The existing Browser Library adapter resolves the
allowed folders and origin, observes the current data and applies exact edits.
Collection Conductor uses the caller's managed panel tree, state arguments and
verified context. This workflow connects those two installed surfaces. It uses
only an owned synthetic origin, folders and panel slots in managed tests.

| Responsibility | Implementation |
| --- | --- |
| Determine whether and how to cite or curate a reference | `maintainLibrary` observes Browser Data and delegates each decision to the goal-facing library lambda. |
| Resolve ambiguity and replan on new state | The decision lambda checks the newest unique evidence and the full target identity. The loop replans from the newly observed snapshot. |
| Choose a handoff destination or reorganize the collection | `arrangeCollection` observes the panel tree and asks its goal-facing child to choose the next scoped operation. |
| Check ownership, apply scoped writes and bind a handoff URL | TypeScript uses the original library and collection ports. It rechecks the current basis and builds the link only from an existing bookmark. |
| Verify the result independently | The managed harness rereads browser records and the panel collection, including protected neighbors. Stored link evidence binds the actual bookmark and destination. |

Browser import preview has a separate provider interface. The existing
managed import workflow requires a selected provider source, categories,
and a retained import receipt. This scope confines actions to saved local
artifacts. No tabs, external URLs or account provider operations are opened.
