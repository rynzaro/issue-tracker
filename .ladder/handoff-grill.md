# Handoff — grill stage (Task Member / task-level collaboration)

**Date:** 2026-07-23
**Feature:** Task-level collaboration — the "Task Member" feature sharpened
from the wayfinder map and partially built.

## What we decided

Task Membership adds a second actor to a project: a user added to a specific
task (**host**), who may create sub-tasks under it and execute those they
create. All original wayfinder decisions are resolved; two new ones were added
during this session.

### Resolved decisions

| Ticket | Decision | Why |
|---|---|---|
| D-01 | Policy module first (`lib/authz/policy.ts`), scoped repos deferred | Multiplayer cannot safely extend 14 scattered `!== userId` checks; two definitions of ownership become a live bug under a second actor. Scoped repos are heavier and were already deferred past MVP. |
| D-02 | Task-level membership only (`TaskMember`) | Matches glossary and AUTHORIZATION_PLAN §7; closes FUTURE_COLLABORATION conflict. No `ProjectMember`, ever. |
| D-03 | Host subtree only | Member sees host + descendants. Literal match to "added to a specific task"; minimal data-isolation boundary. |
| D-04 | Creator-exclusive execution; no `assigneeId` | Time entries are personal estimation evidence. A member executes only their own created subtasks. |
| D-05 | Per-principal checkpoints | Each `Checkpoint` gains `createdById`. A member's plan/reality stream is theirs; the owner's stream stays theirs. Keeps estimation evidence personal. |
| D-06 | Write-set authorization with legible errors | Inside `applyTransition`: target `assertCan` → build plan → loop `assertCan` over plan ids → execute. Bounded cascades forbidden; denial surfaces with a dedicated error variant. |
| D-07 | Distinct act `task:create-child` on host | Explicit act sources avoid the two-definitions bug. Host remains off-limits for all other edits/execution. Member has full creator authority on their own subtree. |
| D-08 | Per-principal estimation grading | Each person graded against their own checkpoints and time. Phase-3 dual-perspective tag analysis remains a separate, later lens. |
| D-09 | Member removal soft-deletes subtree + time entries | Owner wants no orphaned clutter or analysis traces. No copies retained. |
| D-10 | Email on add + owner activity feed | Member gets notified; owner gets visibility. Activity feed reads existing `TaskEvent` rows. |
| D-11 | Only project owner may add/remove members | Membership is owner-controlled; no delegation or member-invitation path. Firm. |

## Schema changes

- Add `TaskMember` table: `id`, `taskId`, `userId`, `createdAt`, `@@unique([taskId, userId])`.
- Add `Checkpoint.createdById` (FK to `User`).
- No `ProjectMember`, no `Task.assigneeId`.

## Vocabulary updates made

- `CONTEXT.md`: Task Member is no longer marked _(future)_; added host/create-child/visibility wording; updated Authorization entry to mention write-set.
- `docs/adr/0012.md`: softened "assignees" wording; clarified creator = execution root.
- `docs/adr/0019.md`: expanded the `Act` union to include `task:create-child` and the full family.
- New `docs/adr/0023-task-membership.md`: records all Task Member decisions.

## What is built

| Item | Status |
|---|---|
| `lib/authz/policy.ts` + unit tests | Built. 56 policy tests pass. |
| `createTask` migrated to `assertCan` (`task:create` / `task:create-child`) | Built. Task Member create-child path tested. |
| `TaskMember` schema + `Checkpoint.createdById` + `TimeEntry.deletedAt` | Migrated. Prisma client regenerated. |
| `lib/services/taskMember.service.ts` (add/remove member, visibility helper) | Built. 10 service tests pass. |
| `lib/actions/taskMember.actions.ts` (add/remove member actions) | Built. |
| `getUserProjectWithTasks` visibility scoping (member sees host subtree only) | Built. Regression tests pass. |
| Member removal cascade (soft-delete subtree + time entries) | Built. |
| D-06: write-set loop in `applyTransition` | Built. Target + every plan id checked via `assertCan`; `TRANSITION_UNAUTHORIZED_CASCADE` returned on denial. Tests cover member finish/unfinish asymmetry. |
| D-05: per-principal checkpoint authorship | Schema field built; design contract added to `checkpoint.service.ts`. Actual checkpoint creation is Iteration 3 work. |

## Still to build

| Item | Notes |
|---|---|
| D-05: per-principal checkpoint service wiring | Schema field exists; `checkpoint.service.ts` still writes a single stream. |
| D-06: write-set loop in `applyTransition` | Policy rule is designed; not yet implemented in `task.service.ts`. |
| D-10: email on add + owner activity feed | `addTaskMember` has a TODO stub for email; no activity feed UI/query. |
| Migrate remaining services to `assertCan` | `task.service.ts` transitions, `timeEntry.service.ts`, `activeTask.service.ts`, `project.service.ts` still use direct `userId` checks. |

## Open questions / owner

| Question | Owner | Notes |
|---|---|---|
| Exact error code for write-set denial (`TRANSITION_UNAUTHORIZED_CASCADE` vs structured `TRANSITION_INVALID`) | Implementer | Decide during `applyTransition` rework; do not overload `UNEXPECTED_ERROR`. |
| Email mechanism / queue | Implementer | Project may lack email infra; decide if synchronous send is acceptable for MVP. |
| Activity feed UI scope (which event types, filtering, pagination) | Implementer | Source is `TaskEvent`; design the surface. |
| Does `Checkpoint.createdById` need a non-null default/backfill for existing rows? | Implementer | All existing checkpoints are solo-user; backfill with project owner's `userId` or the `TaskEvent` actor if available. |
| Member invitation by members | Owner decided: no. Recorded in D-11. | — |
| Should the owner see a member's deleted subtree in a trash/archive view? | Product owner | D-09 says "no copies, no analysis traces" — this means soft-deleted rows stay in DB but are filtered from owner views. If a future "trash" feature is wanted, it is additive. |

## Build order for /to-spec

**Done:** 1–5, 8.

**Remaining:**
6. Update `applyTransition` with write-set loop (D-06).
7. Update checkpoint service for per-principal authorship (D-05).
9. Add email + activity feed (D-10).
10. Migrate remaining services to `assertCan` (timeEntry, activeTask, project service ownership checks).
11. Future: analysis dashboard uses per-principal checkpoints (D-08).

## Conflicts retired

- `docs/FUTURE_COLLABORATION.md` Phase 1 (`ProjectMember`) and Phase 2
  (`assigneeId`) are superseded for Task Member. Phase 3 (dual-perspective tag
  analysis) remains a later, separate lens.
- The `activeTask.service.ts:49` TODO about project membership/roles is wrong and
  should be deleted, not honored, during the policy migration.
