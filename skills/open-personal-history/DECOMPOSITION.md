# Inspect decisions in the Personal archive

| Responsibility | Implementation |
| --- | --- |
| Discover the relevant release or approval milestones | A typed natural-language planner reads the user's request and uses the actual release catalog and workspace memory leads. |
| Find the authorized source within each milestone | A nested callable reads the exact historical file inventory, opens candidate records and chooses grounded field citations. |
| Compare historical values, interpret withdrawals and recommend a next step | The top-level callable composes the independent inspections and compares their quoted evidence against the user's decision criteria. |
| Bind the repository and preserve integrity | TypeScript imports the owned historical versions and release catalog, uses runtime recall and immutable VCS reads, and supplies exact source IDs and hashes. |
| Verify the completed outcome | TypeScript re-reads the exact required files, checks the report against private expectations, rejects invented evidence and verifies that the working chain and main are untouched. |

The memory query is scoped to the disposable repository. The catalog supplies
release names and event identities when memory has no lead. Neither source
assigns a particular record or identifies the final result. Model-facing calls
stay inside the owned repository. The System Testing worker destroys its
disposable context when finished.
