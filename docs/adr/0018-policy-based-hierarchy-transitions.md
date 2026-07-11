# Policy-based hierarchy transitions

**Context:** Task hierarchy operations (complete, uncomplete, archive, unarchive, delete, restore) each have different rules about which ancestor states are forbidden and how state changes propagate up/down the tree. Inline validation logic was duplicated across service functions.

**Decision:** Extract validation and plan-building into `lib/services/taskHierarchyPolicy.ts`. Each operation is a `TransitionKind`. `validateTransition()` checks ancestor legality; `buildTransitionPlan()` returns a `TransitionPlan` with IDs and values for `completedAt`, `archivedAt`, `deletedAt`. Service functions call validate → build plan → execute plan.

**Rules per operation:**
| Operation | Downward cascade | Ancestor forbidden states | Ancestor propagation |
|-----------|-----------------|--------------------------|---------------------|
| COMPLETE | All descendants | deleted, archived, completion gap | None |
| UNCOMPLETE | None | deleted, archived, completion gap | Uncomplete contiguous completed ancestors |
| ARCHIVE | All descendants | deleted, archived | None |
| UNARCHIVE | None | deleted, archive gap | Unarchive contiguous archived ancestors |
| DELETE | All descendants (incl. archived) | deleted | None |
| UNDELETE | None | deletion gap | Undelete contiguous deleted ancestors |

**Consequences:** Adding a new hierarchy operation means adding a validate + build function pair and a `TransitionKind` entry. Service functions follow a uniform pattern: load task → load ancestors → validate → collect descendants (if needed) → build plan → execute plan.
