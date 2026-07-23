# Handoff — wayfinder stage (Task-level collaboration / "Task Member")

**Date:** 2026-07-19
**Feature:** Task-level collaboration — the "Task Member" sketched as _(future)_ in
`CONTEXT.md`. This stage charted the decision map; no code or schema was written.

## What the map is

8 decision tickets in `.ladder/issues/D-##-*.md`, one decision each, with
context, options, and blocking edges. The feature already has most of its hard
thinking recorded in the repo — ADR-0019 (+ addendum), `docs/AUTHORIZATION_PLAN.md`
(esp. §7), `docs/FUTURE_COLLABORATION.md`. The map surfaces the decisions still
*open* and the conflicts between those docs, and orders them.

Dependency order (blocked-by):

```
D-01 (prereq sequencing) ──┐
D-02 (membership anchor) ──┤
D-04 (execution authority) ──┤
                             ├──▶ D-03 (visibility)
                             ├──▶ D-05 (checkpoint authorship)  ◀── hardest
                             ├──▶ D-06 (write-set authorization)
                             ├──▶ D-07 (member structural authority)
                             └──▶ D-08 (analysis grading scope)
```

## Resolved decisions (this session) — the three most upstream

### D-01 — Prerequisite sequencing → Option C
Land the central authorization policy (`lib/authz/policy.ts`, ADR-0019)
**first** — pure, TDD, no DB (AUTHORIZATION_PLAN §5 steps 1–2). Centralizing
the 14 scattered `!== userId` checks is non-negotiable foundation for
multiplayer: under a second actor, the two definitions of ownership
(`project.userId` vs `task.createdById`) is a live bug (ADR-0019 context), and
the write-set rule (D-06) needs `assertCan`. **Scoped repos are deferred** —
not required to ship Task Member, and FUTURE_COLLABORATION itself defers them
past MVP. Manual `where userId/projectId` scoping stays; revisit only if it
hurts. Migration sequence per AUTHORIZATION_PLAN §5; `withAuth` +
`UNAUTHENTICATED` rename is a separate, later change.

### D-02 — Membership anchor → Option A
**Task-level membership only.** A `TaskMember` row per `(taskId, userId)`
grants the CONTEXT.md Task Member rights on that one task. **No project-level
membership, ever** — `ProjectMember` is not modeled now and not a planned
addition. Closes the FUTURE_COLLABORATION-vs-AUTHORIZATION_PLAN conflict firmly
on the glossary / AUTHORIZATION_PLAN §7 side ("added to a specific task" is
the only membership concept). FUTURE_COLLABORATION Phase 1 (`ProjectMember`)
and Phase 2 (`assigneeId`) are both superseded — mark them so when multiplayer
work begins.

### D-04 — Execution authority under Task Membership → Option A
**Creator-exclusive execution, settled.** A Task Member executes only the
subtasks they create; the owner never overrides another creator's execution
authority and cannot execute a member's subtask. **No `assigneeId`** —
concept rejected; `#19` resolves to "no assignee concept"; FUTURE_COLLABORATION
Phase 2 reversed. `createdById` is the execution root **by design**, not a
stopgap — the `activeTask.service.ts:49` TODO is **deleted, not honored**,
during the D-01 migration. ADR-0012's "planner/distributor independently of
assignees" wording needs softening. The estimation-evidence invariant holds:
a member's time lands only on tasks they created.

## Open tickets in dependency order

### D-03 — Task Member visibility scope *(blocked by D-01, D-02 — now unblocked)*
What subtree a member sees: host subtree only / host + ancestor chain (read) /
full project. Visibility is the structural/visibility family (the one place
FUTURE_COLLABORATION's "project membership = task access" survives
AUTHORIZATION_PLAN, §7 conflict 1). Also determines which `CheckpointTask` rows
a member's actions generate and who reads them. Recommend **B (host subtree +
read-only ancestor chain)** — context without leaking siblings or other
members' evidence.

### D-07 — Task Member's structural authority on the host *(blocked by D-02, D-01 — now unblocked)*
Confirm the act set: member holds only `task:create-child` on the host (not
edit/complete/archive/delete/execute), full authority on their own created
subtree. Today `createTask` gates on `project.userId === me` (task.service.ts:335)
— denies a member outright; the new act must be grantable by *host ownership or
host membership*, a new authority path. Recommend **A (distinct act
`task:create-child`)** over reusing `task:create` with a parent predicate —
keeps act sources explicit (AUTHORIZATION_PLAN §3 rationale), avoids the
two-definitions bug.

### D-05 — Checkpoint authorship with a second actor *(blocked by D-02, D-04, D-03, D-07)* — **the hard one**
What checkpoints *mean* when a member creates subtasks under the host. A
`SCOPE_CHANGE` by a member is a plan-checkpoint trigger, but the host's plan
belongs to the **host owner** — whose settled judgement is it? The member's
new child lands as a column in the host owner's parent cross-section
(`CheckpointTask`, invariant 3), contaminating the owner's belief record.
Also: does a member's `WORK_STARTED` close the **host owner's** plan window
(ADR-0022)? (Almost certainly no.) Recommend **A (per-principal checkpoints)**
— `Checkpoint.createdById`; each person's baseline/plan/reality stream is
their own; a member's new child appears in the owner's parent cross-section
as a *fact*, not the owner's *belief* about its estimate. Likely needs a
schema addition (`Checkpoint.createdById`). This is the decision that most
shapes the feature and the one /to-spec must not skip.

### D-06 — Write-set authorization for member-initiated transitions *(blocked by D-01, D-04)*
Largely designed in AUTHORIZATION_PLAN §7: a transition is permitted iff the
principal may transition **every node the plan touches** (the plan's ids,
already returned by `buildTransitionPlan`); target `assertCan` → build plan →
loop `assertCan` over write-set → execute. The finish-but-not-unfinish
asymmetry (member may complete their subtree, may not un-complete if it
reopens the owner's parent) is **intended**. Recommend **B over A**: same
rule, but the write-set denial needs a *legible* error variant (current
`TRANSITION_INVALID`/`UNEXPECTED_ERROR` codes, ADR-0018, don't carry
direction). Option C (trim the plan to the authorized subset) is refused —
bounded cascades manufacture the invariant-#5 gap.

### D-08 — Estimation-analysis grading scope *(blocked by D-04, D-05)*
Does #26's estimate-accuracy analysis grade per-principal (each person's
estimates vs their own time) or per-task/per-project (one number absorbing
members)? Recommend **A (per-principal)**, consistent with the
estimation-evidence-is-personal principle that D-04 enforces at the execution
layer. Phase-3 dual-perspective *tag* analysis (FUTURE_COLLABORATION, already
enabled by `TaskTag.userId`) is a separate cross-person lens and coexists —
option C frames them as two views on one schema.

## What /to-spec needs to know

1. **D-01 is a hard prerequisite.** No Task Member feature work begins until
   the ADR-0019 policy module lands and the service-by-service migration
   (AUTHORIZATION_PLAN §5) is green. Spec the policy module first; the Task
   Member acts (`task:create-child`, the `task:*` family with a host-membership
   grant source) are its first new consumers.
2. **Membership is task-level only** (D-02). Model `TaskMember`, not
   `ProjectMember`. There is no `assigneeId` (D-04). `createdById` is the
   execution root by design.
3. **D-05 is the central spec question.** Checkpoint authorship with a second
   actor is unmodeled and is the decision that most shapes the feature.
   `Checkpoint` likely gains `createdById`; plan vs reality checkpoint families
   (ADR-0022) interact with multi-author in ways the current ADRs don't cover.
   /to-spec should resolve D-05 before specifying the checkpoint service.
4. **The upward-cascade hazard (D-06) is already designed** in AUTHORIZATION_PLAN
   §7 — adopt the write-set rule, ship the intended finish/un-finish asymmetry.
5. **Doc conflicts to clean up at build time:** FUTURE_COLLABORATION Phase 1
   (`ProjectMember`) and Phase 2 (`assigneeId`) are superseded by D-02/D-04;
   ADR-0012's "assignees" wording and the `activeTask.service.ts:49` TODO are
   wrong and get fixed during the D-01 migration (AUTHORIZATION_PLAN §5 steps
   5–6).
6. **Three downstream tickets (D-03, D-07, D-08) have recommendations in this
   handoff** but were *not* resolved with the user this session — /to-spec
   should treat them as open and resolve them (they're now unblocked by the
   three upstream resolutions).

## State of the map

- Resolved: D-01, D-02, D-04 (the three most upstream).
- Open, unblocked, ready to resolve: D-03, D-07.
- Open, blocked (need D-03/D-07 first): D-05, D-08.
- Open, blocked (need policy module): D-06.