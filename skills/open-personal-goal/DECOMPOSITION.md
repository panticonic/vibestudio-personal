# Open Mission Control goals

The root receives the user's words and chooses work after observing an owned
Mission Control board. It can report readiness, change planning fields, and
write a handoff that reflects the final board. Mission execution, automation
configuration, and publishing are outside this planning capability.

| Responsibility | Implementation |
| --- | --- |
| Read the projects, cards, dependencies, and revisions | The installed Mission Planning binding reads the actual store through the scoped service. |
| Decide which card work will fulfill the goal | The root delegates to `chooseMissionWork`, which interprets the goal against the observed projects and plans ordered intents. |
| Resolve each intent against the latest board | `decideMissionStep` delegates to card selection and prerequisite traversal. It holds ambiguous titles, cycles, incomplete observations, and readiness blocked by unfinished work. |
| Apply or replan a change | `executeMissionStep` uses the observed revision. A rejected stale attempt returns fresh observations. The same intent is reconsidered once from that fresh board. |
| Verify the write | `verifyMissionStep` checks the identity, revision, and exact selected planning fields. The managed verifier independently reads the store and checks unrelated fields and out-of-scope cards. |
| Decide what a handoff covers | `prepareMissionHandoff` resolves the cards the user asked to include after the work. |
| Stage and verify a handoff | TypeScript formats exact current card state, writes it to the owned scratch directory, and returns the digest of the readback. |

Managed worlds create real cards through the existing test-owned Mission
Planning store. Separate execution grants cover allowed cards and operation
kinds. Expected changes and blockers remain with the verifier. Reference
runs use the same live operations. Negative and alias checks exercise the
guard and readback beyond a successful report.
