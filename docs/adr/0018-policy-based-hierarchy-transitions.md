# Policy-based hierarchy transitions

**Context:** Task hierarchy operations (complete, uncomplete, archive, unarchive, delete, restore) each have different rules about which ancestor states are forbidden and how state changes propagate up/down the tree. Inline validation logic was duplicated across service functions.

**Decision:** Extract validation and plan-building into `lib/services/taskHierarchyPolicy.ts` (moved to `lib/domain/taskHierarchyPolicy.ts` in #59 — pure domain logic, client-importable, owns its own error type). Each operation is a `TransitionKind`. `validateTransition()` checks legality; `buildTransitionPlan()` says what to change. Callers validate → build plan → execute plan.

**Reworked by #57** (design: teach lesson 3, 2026-07-14; slices #59/#60/#62/#63/#64). The six per-operation rule sets below are now read off one order, and the six service functions are one orchestrator. What follows describes the design as it stands.

## One strength order

```
delete > archive > complete
```

A stronger state **covers** the weaker ones: a task held by a stronger state is allowed to sit outside a weaker one its ancestors hold. One order runs both directions:

- **Forward kinds** (COMPLETE/ARCHIVE/DELETE) cascade down through states strictly weaker than their own and stop at equal-or-stronger.
- **Backward kinds** (UNCOMPLETE/UNARCHIVE/UNDELETE) clear their own state on the target and the unbroken run of ancestors sharing it, then **inherit** the strictly weaker states the remaining ancestors still hold, backdated to the ancestor's date (#63). Clearing a state removes the cover it gave, so what it was covering must now be taken on, or invariant 5 breaks.
- Illegal moves fall out of the same order — uncompleting through an archived ancestor asks to leave a task outside a state its ancestor's stronger one forbids.

| Operation | Self forbidden states | Cascade | Ancestor forbidden states | Ancestor propagation |
|-----------|----------------------|---------|--------------------------|---------------------|
| COMPLETE | deleted, archived, completed | down, stops at archived/deleted/completed | deleted, archived, completion gap | None |
| UNCOMPLETE | deleted, archived, not completed | None | deleted, archived, completion gap | clears contiguous completed ancestors; inherits nothing (nothing is weaker) |
| ARCHIVE | deleted, archived | down, stops at deleted/archived | deleted, archived | None |
| UNARCHIVE | deleted, not archived | None | deleted, archive gap | clears contiguous archived ancestors; inherits `completedAt` |
| DELETE | deleted | down, stops at deleted | deleted | None |
| UNDELETE | not deleted | None | deletion gap | clears contiguous deleted ancestors; inherits `archivedAt`, then `completedAt` if still uncovered |

**Stop rule (#44):** a downward cascade stops at a descendant already held by the target state *or anything stronger* — its date is not re-stamped and the walk does not continue below it. State dates are estimation evidence; the no-gaps invariant (CONTEXT.md invariant 5) guarantees everything below the stop is at least as strongly held, so nothing is missed. Guarded by `createTask` refusing deleted, archived, or completed parents.

The order decides the reach, so callers hand the policy the **whole subtree** in whatever state. Filtering the fetch per kind — as the service used to, including archived rows for DELETE only — put the same rule in two places.

## The plan

`buildTransitionPlan()` returns flat lists the executor replays with no knowledge of the kind:

- `writes: { state, ids, value }[]` — a plan lists only what it does; a kind with nothing to do plans nothing. The same state may appear more than once with different values, which is how a backward kind backdates some ids while clearing others.
- `events: { kind, taskId, at, causedBy? }[]` — one per task the transition's **own-state** write touches (`OWN_STATE`: the flag the kind is about), plus one per inherited state (#63): a repaired task taking on an ancestor's weaker state gets the forward kind that sets it (`archivedAt` → `ARCHIVE`), with `causedBy` naming the ancestor the state came from (#54, ADR-0020). The stored value may be backdated while the event carries the time of the act — for inherits too: the row keeps the ancestor's date, the event carries now.

Events are named in domain words; mapping `TransitionKind` → `TaskEventType` is the service's job, which is what keeps this module free of prisma (#59).

## One orchestrator (#62)

`applyTransition(kind, taskId, userId)` in `task.service.ts` holds the sequence once: one plain fetch **by id alone** → auth → transaction (load ancestors → validate → collect subtree → build plan → execute writes + events atomically). The six exports are one-liners over it.

**No NOT_FOUND masking:** the fetch filters on nothing but the id. Per-kind `where` clauses (`archivedAt: null`, …) were the transition rules written a second time, and they disagreed with the policy about what the user did wrong — unarchiving an unarchived task answered "not found". Legality is `validateSelfState()`'s alone (#15).

**Error codes (#14):** `TRANSITION_INVALID` = the tree is sound, the move is not allowed on it (reachable; the user's to fix). `UNEXPECTED_ERROR` = a gap check tripped, meaning invariant 5 is already broken (unreachable by any transition).

**Timer guard:** kept in the orchestrator for the three forward kinds — reaching down the tree is what makes a running timer below the target a reason to refuse.

## One rule, both sides

The policy is the only judge for client and server alike. The restore dialog's preflight (`archive/restoreCheck.ts`) calls the same `validateTransition` / `buildTransitionPlan` and only puts the answer into German (#64). It previously kept its own copy of the rules, reading a flattened state label, and refused undeletes the server allowed — the drift that prompted #57.

**Consequences:** Adding a hierarchy operation means a `TransitionKind` entry, its `OWN_STATE`, and a `TRANSITIONS` config row (failure message; timer message if it cascades) — not a new function pair or service function. Anything reading a transition rule reads it from `lib/domain/taskHierarchyPolicy.ts`; a second copy anywhere is the bug this ADR exists to prevent.
