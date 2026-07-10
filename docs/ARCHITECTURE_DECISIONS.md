# Architecture Decisions

Chronological. Completed above the line, future below.

---

## Completed

### AD-2: Checkpoint settings → ProjectSettings

Moved checkpoint config from `User` to `ProjectSettings` (1:1 with `Project`). Different projects need different checkpoint granularity.

### AD-3: Category → Tags (M:N)

Replaced `category: String?` with `Tag` model (many-to-many). Tasks span multiple concerns. Event: `CATEGORY_CHANGED` → `TAGS_CHANGED`, payload: `{ added: string[], removed: string[] }`.

### AD-4: Position removed

Removed from Task and TodoItem. Ordering handled client-side via cache/state. Re-add if persistent ordering needed.

### AD-5: isFromTodo removed

Redundant. `TodoItem.convertedToTaskId` already tracks conversion lineage.

### AD-6: TodoItem.text → title

Consistency with `Task.title`.

### AD-7: No timestamps on User

Not needed yet. Add when required.

### AD-8: Task status via datetime flags, no enum

Status is derived from nullable datetime fields (`completedAt`, `archivedAt`, `deletedAt`) rather than a `TaskStatus` enum. Avoids enum migration overhead, allows null-check queries directly, and keeps each state transition explicit. `archivedAt` to be added in Iteration 1.

### AD-9: WORK_STARTED scoped to task

Baseline check = "no baseline on this task." Not "nearest ancestor with children" (ambiguous, unnecessary).

### AD-10: Soft delete with app-level cascade

Soft delete with application-level cascade. Setting `deletedAt` on a task recursively sets `deletedAt` on all descendants via service code (not DB cascades — see AD-11). All queries filter `deletedAt IS NULL`. No restore functionality. Projects also use soft delete (set `deletedAt`, filter from queries).

**Rationale:** Cascade deletion maintains tree integrity and prevents orphaned tasks that would complicate UI logic. Children with `parentId` pointing to a deleted parent would become invisible in tree-building (not pushed to parent's children array, not pushed to roots). Cascading ensures consistent tree state.

**Implementation:** Service layer collects all descendant IDs via BFS/DFS, then `updateMany({ where: { id: { in: [taskId, ...descendantIds] } }, data: { deletedAt: new Date() } })`.

### AD-11: No DB cascade deletes

All FKs `onDelete: Restrict`. Service code handles deletion dependencies explicitly. AD-10's cascade is application-level only — DB-level cascades remain disabled to prevent accidental data loss and maintain explicit control over deletion logic.

### AD-12: Task.projectId required

`projectId` is now mandatory on `Task`. Every task belongs to exactly one project. Eliminates the inference chain for ownership (Task → Project → User) and ensures consistent hierarchy.

### AD-13: Task.createdById — direct ownership

`Task.createdById` is a required FK to `User`. Records who created the task, immutable. In solo mode, always the project owner. In future multi-user mode, records the planner/distributor independently of assignees.

### AD-14: Tags scoped per-user

`Tag.userId` added. Each user has their own tag vocabulary, reusable across all their projects. Enables cross-project analysis ("how are my backend estimates across all projects?"). `@@unique([name, userId])` prevents duplicate tag names per user.

### AD-15: Explicit TaskTag junction table with user attribution

Replaced implicit `Tag[] ↔ Task[]` many-to-many with explicit `TaskTag` model. Each row records `taskId`, `tagId`, and `userId` (who applied the tag). In solo mode, userId is always the current user. In future team mode, this enables dual-perspective analysis: planner tags for planning shortcomings, executor tags for execution analysis — both on the same task.

### AD-16: Single active task, frontend-derived parent indicators, recursive time rollup

Starting work on a task creates ONE TimeEntry for that task only. Only one task can be active per user at a time — starting a new task auto-stops the previous one. Parent tasks never get their own TimeEntry from child work; instead, the frontend derives a "has active descendant" indicator by walking the task tree during tree building. Total tracked time for any task = own TimeEntries + recursive sum of children's TimeEntries (computed on-the-fly, not denormalized). Status is derived at read time: has ActiveTimer → IN_PROGRESS, `completedAt ≠ null` → DONE, else → OPEN (see AD-17 for ActiveTimer enforcement). Complements AD-8 (status via datetime flags). Rejected alternative: creating TimeEntries for ancestor tasks ("ancestor chain") — too many redundant DB rows, time rollup should be computed not duplicated.

### AD-17: ActiveTimer table; mandatory stoppedAt on TimeEntry

**Context:** Enforce one active timer per user (AD-16).

**Decision:** Separate `ActiveTimer` table (`@@unique([userId])`). `TimeEntry.stoppedAt` and `duration` become NOT NULL.

**Rationale:**

- `@@unique([userId])` makes the invariant structurally impossible to violate — no app-level assertions needed.
- No dual source of truth (vs. pointer approach): ActiveTimer = running, TimeEntry = completed. Complementary, not redundant.
- Forward-compatible with all future delegation models.

**Schema addition:**

```prisma
model ActiveTimer {
  id        String   @id @default(cuid())
  userId    String   @unique
  taskId    String
  startedAt DateTime
  user      User     @relation(fields: [userId], references: [id])
  task      Task     @relation(fields: [taskId], references: [id])
}
```

TimeEntry changes: `stoppedAt DateTime` (NOT NULL), `duration Int` (NOT NULL).

**Consequences:** `startWork` and `stopWork` operate inside a transaction (delete ActiveTimer → insert TimeEntry, or vice versa). Time rollup = `SUM(TimeEntry.duration)` for completed work + `NOW() - ActiveTimer.startedAt` if one exists for the task.

### AD-18: Authorization is the action layer's responsibility

**Context:** Service functions are internal utilities that may appear to lack userId scoping or authorization checks (e.g., `getProjectById` exported but only called from other services; `getTimeEntriesForTask` doesn't filter by userId in the query).

**Decision:** Authorization and user scoping are exclusively the responsibility of the **action layer** and **server components**. Service functions are internal building blocks that assume the caller has already verified permissions.

**Rationale:**

- **Single point of control**: Auth checks happen once at the entry point (Server Action or Server Component), not scattered across service functions.
- **Composability**: Services can call other services without repetitive auth checks. Internal functions (e.g., `getProjectById`) can be used by other services without requiring userId everywhere.
- **Session access**: Only actions and server components have access to `auth()` session context. Services remain pure data layer functions.
- **Clear boundary**: The action layer is the security boundary. Everything below it (services, Prisma) operates on pre-validated, pre-authorized data.

**Pattern:**

```typescript
// ❌ NOT in service layer
export function getProjectById(projectId: string, userId: string) {
  // Don't check userId here
}

// ✅ In action layer
export async function getProjectAction(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Call service that verifies ownership
  return getUserProjectById({ userId: session.user.id, projectId });
}
```

**Consequences:** When reviewing service functions, the absence of authorization checks is **by design**, not a vulnerability. Always verify that the calling action or server component performs the auth check before invoking the service.

### AD-19: Policy-based hierarchy transitions

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

---

## Decided, not yet implemented

### AD-20: Centralized authorization policy at service boundaries

**Status:** Decided 2026-07-02. Awaiting hand implementation — checklist in `docs/REFACTOR_TODO.md`. Extends (and partially retires) AD-18.

**Context:** AD-18 made authorization the action layer's job and let services assume a pre-authorized caller ("services compose freely without re-checking auth"). A review of that property found it holds today only because the permission model is flat — one principal, binary ownership, no roles. Its known limitations:

- **Security by convention.** Nothing enforces that every action calls `auth()` or that services receive the session's `userId` rather than one derived from request input.
- **Confused-deputy exposure.** Unscoped internal helpers (e.g. `getProjectById(projectId)` — exported, currently uncalled, no ownership check) sit one name away from scoped ones; only the `getUser*` naming convention distinguishes them.
- **Inconsistent ownership definitions.** 19 scattered checks define ownership two ways: `project.userId` (task/project services) vs `task.createdById` (timeEntry/activeTask services). These coincide in solo mode, but AD-13 redefines `createdById` as "planner" in team mode — one of the two is a latent bug.
- **Breaks under team mode.** The moment permissions stop being flat (AD-13 planner/assignee, AD-15 dual-perspective tagging), a raw `userId: string` cannot express authority, and free composition allows a service authorized for the caller's role to reach an operation the caller shouldn't perform.

**Decision:** Hand-rolled centralized policy module — `lib/authz/policy.ts`. No external engine (CASL/Oso/OpenFGA are overkill for this matrix; the seam is the function signature, so an engine can be swapped in later without touching callers).

```typescript
type Principal = { userId: string };          // later: + role, projectGrants
type Act = "project:read" | "project:update" | "project:delete"
         | "task:complete" | "timeEntry:create" | /* ... */;

can(principal: Principal, act: Act, resource): boolean   // pure, sync, no I/O
assertCan(principal, act, resource): ServiceErrorResponse | null
```

Layering after AD-20:

- **Action layer** — authentication only: `auth()` → `Principal`, zod validation, `revalidatePath`. Unchanged shape, thinner content (ad-hoc ownership logic leaves).
- **Service layer** — loads the resource, then `assertCan(principal, act, resource)` before acting. Authorization moves to the point of use so *every* path (action, server component, service→service composition) passes the check.
- **Policy module** — all "may" rules in one auditable file. Pure and synchronous: it judges already-loaded data, never queries — services load, policy decides.

Rules of placement: resource-free checks (session exists; future global role gates) stay at the entry point; resource-dependent checks live in services via the policy module.

**Error semantics:** `assertCan` masks unauthorized as `NOT_FOUND`, preserving the current non-leaking behavior — no service can accidentally return a `FORBIDDEN` that leaks resource existence.

**Rationale:**

- One auditable place where policy lives, replacing 19 scattered `!==` checks with two definitions of ownership.
- Fixes the confused-deputy blind spot structurally: checks sit where the work happens, so composition cannot skip them.
- Forward-compatible: team mode extends `Principal` and the rule table; callers don't change.
- Pure `can()` is unit-testable in milliseconds with no DB.

**Consequences:** AD-18's "services assume a pre-authorized caller" is retired; services re-check at their boundary (defense in depth). The "compose freely without re-checking auth" property is deliberately given up — that property was a benefit purchased by the flat permission model, and this decision knowingly pays it back. AD-18's consequence note for reviewers inverts: absence of an `assertCan` call in a service that touches an owned resource becomes a review finding, not a design feature.

---

## Future (decide when relevant)

### Iter 1: Persistent ordering?

Position removed (AD-4). Ephemeral or persisted drag-and-drop order? If persisted, re-add `position`.

### ~~Iter 1: Time rollup strategy~~ → Resolved by AD-16

Decision: on-the-fly recursive `SUM()`. A task's total tracked time = own TimeEntries + recursive sum of children's TimeEntries. No denormalized `trackedTime` column. Acceptable for <10k tasks.

### Iter 3: Debounce = destructive replace?

Debounced checkpoint replaces snapshot → intermediate state lost. Acceptable?

### Iter 3: Checkpoints on leaf tasks?

No children → `childCount=0`, empty CheckpointTask rows. Skip or keep?

### Iter 5: Analysis without COMPLETED?

Analysis needs baseline→completion. Allow analysis on latest checkpoint if never formally completed?

### Iter 5: Root task per project?

Deferred. No perf benefit now. Revisit if project-level aggregation painful without single root.

### Gap: COMPLETE doesn't guard against an already-archived target

AD-19's COMPLETE self-fetch filters `deletedAt: null` only, not `archivedAt`. `validateTransition("COMPLETE", ...)` only checks ancestors for archived/deleted state, not the target task itself. Net effect: a task can be completed directly while it is itself archived. Unclear if intentional (retroactively recording finished work on archived items) or an oversight — decide, then either add the guard or document it as allowed behavior.
