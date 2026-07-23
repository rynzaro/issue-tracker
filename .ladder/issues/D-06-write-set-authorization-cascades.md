# D-06 — Write-set authorization for member-initiated transitions

**Status:** RESOLVED 2026-07-23 — Option B

## Context

AUTHORIZATION_PLAN §7 sketches the resolution for hierarchy transitions under
a second actor: **a transition is permitted iff the principal may transition
every node the plan touches** — exactly the plan's ids, which
`buildTransitionPlan` already returns (`plan.setCompletedAt.ids`, …), ancestors
already loaded in the same tx. Shape: target-level `assertCan` up front (cheap,
masks existence), then a post-plan loop over the write-set before `executePlan`.

The hazard it solves (§7): finish is subtree-local (a member's subtree is their
own creation), but **un-finish is not** — `buildUncompletePlan`/`Unarchive`/
`Undelete` repair the *contiguous transitioned prefix of ancestors*, so
reopening a member's subtask can force the owner's completed parent back open.
Bounded cascades are forbidden (they manufacture the invariant-#5 gap). So
all-or-nothing over the write-set is the only coherent semantics, and the
resulting finish-but-not-unfinish asymmetry is *intended* — the two authority
families meeting at the completion boundary.

This is largely designed. The open decision is whether to adopt it as-is for
Task Membership, and the placement of the write-set loop inside `applyTransition`
(ADR-0018's one orchestrator).

## Decision

Adopt the AUTHORIZATION_PLAN §7 write-set rule verbatim for Task Membership, and
place the post-plan `assertCan` loop inside `applyTransition` (after
`buildTransitionPlan`, before `executePlan`)? Or revise?

## Options

- **A. Adopt as-is.** Target `assertCan` → build plan → loop `assertCan` over
  every id in `plan.*.ids` → execute. The asymmetry (member may complete their
  subtree, may not un-complete if it reopens the owner's parent) is intended and
  shipped. Needs D-01's policy module; the loop calls `can()` per node.
- **B. Adopt, but surface the asymmetry to the user.** Same rule, but when the
  write-set loop fails on an ancestor the user lacks authority over, return a
  *legible* error ("completing this would reopen a task you can't touch" is
  backwards — un-completing would; the message must explain the direction).
  The current `TRANSITION_INVALID`/`UNEXPECTED_ERROR` codes (ADR-0018) may not
  carry enough; may need a new error variant for write-set denial.
- **C. Restrict the transition instead of denying.** If the write-set crosses
  the member's authority boundary, trim the plan to the authorized subset.
  Rejected by §7 ("bounded cascades are forbidden") — manufactures the
  invariant-#5 gap. Listed only to be refused.

## Resolution (2026-07-23)

**Option B — adopt the write-set rule and surface denials legibly.** Inside
`applyTransition`: target `assertCan` up front (cheap, masks existence) →
`buildTransitionPlan` → loop `assertCan` over every id in the plan's write-set
→ `executePlan`. If the loop fails, the operation is denied with a dedicated
error variant that explains *why* (e.g., "reopening this task would also reopen
a task you cannot modify"), not a generic `TRANSITION_INVALID` or
`UNEXPECTED_ERROR`.

Consequences:
- A member may complete/uncomplete tasks inside their own created subtree.
- A member may **not** uncomplete a task whose upward repair would reopen a host
  or owner task they lack authority over — the write-set loop denies it.
- The intended finish-but-not-unfinish asymmetry is shipped; bounded cascades
  remain forbidden.
- A new error code is likely needed in `lib/errors.ts` (e.g.
  `TRANSITION_UNAUTHORIZED_CASCADE`) or a structured payload on
  `TRANSITION_INVALID`. Decide at implementation time; do not overload
  `UNEXPECTED_ERROR`, which is reserved for invariant-5 gaps.

## Implementation note (2026-07-23)

Implemented in `lib/services/task.service.ts`:

- `applyTransition` now calls `assertCan` on the target using the transition's
  act (e.g. `task:complete`) before opening the transaction.
- After `buildTransitionPlan`, `authorizeWriteSet` loops over every task id in
  `plan.writes` and calls `assertCan` again. If any check fails, the operation
  returns `TRANSITION_UNAUTHORIZED_CASCADE` with the offending `taskId` in
  `details`.
- The target task is used directly (no extra query); other plan ids are loaded in
  the same transaction with `createdById`, `project.userId`, and `members`.

## Blocking edges

- **Blocks:** the `applyTransition` rework for multiplayer.
- **Blocked by:** D-01 (policy module + `assertCan`), D-04 (who may
  complete/uncomplete which nodes).