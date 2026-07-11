# Issue Tracker (OnTrack)

A solo-first issue tracker with time tracking: projects hold task trees, and work on tasks is timed so a person can sharpen their own estimates. One user per project today; task-level collaboration is planned. The analytical core: estimation error decomposes into **scope error** (time on tasks not planned at baseline) and **effort error** (overrun on planned tasks). Decision history: `docs/adr/` (0001–0019).

## Language

### Authority

**Principal**:
The authenticated user on whose behalf an operation runs.
_Avoid_: session user, caller

**Project Owner**:
The single user a project belongs to. Holds structural authority over the project and every task in it.
_Avoid_: admin, unqualified "owner"

**Task Creator**:
The user who created a task. Holds execution authority over it, exclusively.
_Avoid_: assignee, unqualified "planner"

**Structural Authority**:
The right to shape a project's task tree — create, edit, complete, archive, delete, and restore tasks, and manage the project itself. Flows from project ownership.

**Execution Authority**:
The right to work a task — run its timer and log time against it. Exclusive to the task's creator; not even the project owner may execute another's task.
_Avoid_: "ownership" when talking about time operations

**Entry Author**:
The user who logged a time entry. Only the author may amend or remove it; the project owner may read it.

**Estimation Evidence**:
A person's time entries, seen as the record by which they judge their own ability to estimate. The reason execution authority is exclusive to the creator.

**Task Member** _(future)_:
A user added to a specific task. May create sub-tasks under it (which they then execute); may not edit or execute the task itself.

### Judgments

**Authorization**:
Whether a principal may perform an act on a resource. Judged once, on the target of an operation — cascading effects (downward onto descendants, upward ancestor-chain repairs) are consequences of the authorized act, not separately authorized.

**Transition Legality**:
Whether a task subtree may make a state change at all, regardless of who asks. A principal-free judgment, separate from authorization.

### Mechanics

**Task**:
Hierarchical unit of work (`parentId` self-ref, unlimited nesting, `depth` = ancestor count, 0 = root). Belongs to one Project.

**Estimate**:
Minutes, nullable, on Task and TodoItem.

**TimeEntry**:
Completed work interval; mandatory `stoppedAt`, `duration` in seconds.

**ActiveTimer**:
The one running timer per user (`@@unique([userId])`, ADR-0016). Running work = ActiveTimer, finished work = TimeEntry; converting one to the other is the only transition, transactional, no overlaps.

**Checkpoint**:
Snapshot of a task + direct children (estimate, tracked time per child). First WORK_STARTED checkpoint on a task = **baseline** (`isBaseline`, scoped per-task). `existedAtBaseline` on CheckpointTask enables the scope/effort split.

**TodoItem**:
Lightweight pre-task checklist entry on a task; convertible to sub-task, lineage via `convertedToTaskId`.

**Tag / TaskTag**:
M:N; tags scoped per-user (ADR-0013); junction records who applied it (ADR-0014).

**TaskEvent**:
Append-only audit row per mutation, 12 types, Zod-validated payloads.

**Status**:
Derived from datetime flags, no enum (ADR-0007): `completedAt`, `archivedAt`, `deletedAt` (soft delete, ADR-0009). All three restorable via hierarchy transitions.

## Architecture rules

- **Three layers**: Component → Server Action (`lib/actions/`) → Service (`lib/services/`) → Prisma. Business logic in services only. Reads: server components call services directly. API routes only for external integrations.
- **Security boundary (ADR-0017 → ADR-0019)**: actions + server components authenticate via `auth()`. Ownership checks today: 19 scattered sites inside services. Decided target: central `lib/authz/policy.ts`, pure `can()`/`assertCan()`, `NOT_FOUND`-masked errors — **deliberately deferred until multiplayer** (#22; plan: `docs/AUTHORIZATION_PLAN.md`).
- **Hierarchy transitions (ADR-0018)**: complete/uncomplete/archive/unarchive/delete/restore all flow through `lib/services/taskHierarchyPolicy.ts` — `validateTransition()` → `buildTransitionPlan()` → execute. Never inline hierarchy validation in service functions. Per-operation rules table: the ADR.
- **Toggl isolation**: all Toggl code in `lib/toggl/`; per-user tokens in User model, never env vars; app fully functional without Toggl.

## Invariants (verify after changes)

1. One ActiveTimer per user (DB-enforced).
2. TaskEvents append-only — never update/delete rows.
3. Checkpoints fire for changed task + direct parent, never grandparent+.
4. At most one baseline checkpoint per task.
5. No state gaps in ancestor chains (e.g. completed ancestor above uncompleted descendant = integrity error, policy-enforced).
6. Soft-deleted rows filtered from every query.
7. Toggl optional everywhere.

## Current state (verified against code 2026-07-11)

- **Implemented**: auth, project/task CRUD, hierarchy transitions incl. archive/restore/undelete, timers (ActiveTimer→TimeEntry), tags, soft delete, default project, sidebar layout, toast system.
- **Modeled, not wired**: TaskEvent emission (`event.service.ts` exists; zero `emitEvent` call sites in mutating services), checkpoint auto-triggers, analysis dashboard, TodoItem UI, Toggl integration.
- Schema source of truth: `prisma/schema.prisma` — never trust a doc's schema copy over it.
- Backlog + pending decisions: GitHub issues (`docs/agents/issue-tracker.md`).

## Consumer rules

When exploring or producing output about this repo: use this glossary's vocabulary, don't drift to synonyms. Read the `docs/adr/` entries touching your area first. Output contradicting an ADR must flag it: "Contradicts ADR-0xxx — worth reopening because…".
