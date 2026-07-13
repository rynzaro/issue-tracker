# Policy-based hierarchy transitions

**Context:** Task hierarchy operations (complete, uncomplete, archive, unarchive, delete, restore) each have different rules about which ancestor states are forbidden and how state changes propagate up/down the tree. Inline validation logic was duplicated across service functions.

**Decision:** Extract validation and plan-building into `lib/services/taskHierarchyPolicy.ts`. Each operation is a `TransitionKind`. `validateTransition()` checks ancestor legality; `buildTransitionPlan()` returns a `TransitionPlan` with IDs and values for `completedAt`, `archivedAt`, `deletedAt`. Service functions call validate → build plan → execute plan.

**Rules per operation:**
| Operation | Self forbidden states | Downward cascade | Ancestor forbidden states | Ancestor propagation |
|-----------|----------------------|-----------------|--------------------------|---------------------|
| COMPLETE | deleted, archived, completed | Descendants, stop rule | deleted, archived, completion gap | None |
| UNCOMPLETE | deleted, archived, not completed | None | deleted, archived, completion gap | Uncomplete contiguous completed ancestors |
| ARCHIVE | deleted, archived | Descendants, stop rule | deleted, archived | None |
| UNARCHIVE | deleted, not archived | None | deleted, archive gap | Unarchive contiguous archived ancestors |
| DELETE | deleted | Descendants (incl. archived), stop rule | deleted | None |
| UNDELETE | not deleted | None | deletion gap | Undelete contiguous deleted ancestors |

**Self-state (#15):** the task's own flags are judged in `validateSelfState()`, first step of `validateTransition()` — one source of truth. Service fetch where-clauses remain only for visibility and NOT_FOUND masking.

**Stop rule (#44):** a downward cascade stops at the first descendant already in the target state — its date is not re-stamped and the walk does not continue below it. State dates are estimation evidence; the no-gaps invariant (CONTEXT.md invariant 5) guarantees everything below the stop is already in the target state, so nothing is missed. Guarded by `createTask` refusing deleted, archived, or completed parents.

**Consequences:** Adding a new hierarchy operation means adding a validate + build function pair and a `TransitionKind` entry. Service functions follow a uniform pattern: load task → load ancestors → validate → collect descendant nodes (if needed) → build plan → execute plan. Downward plans receive descendant nodes (with the three state flags), not bare ids — the policy decides what to touch, the service only fetches and executes.
