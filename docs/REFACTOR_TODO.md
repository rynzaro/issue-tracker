# Refactor TODO — Architecture Hardening

Findings from a critical review of the merged architecture (2026-07-01). None are blocking for solo use; ordered roughly by how much they'd bite once more than one person uses the app.

## Bugs (not just hardening)

- [ ] **`todoList.tsx` renders `<TodoList />` inside itself with no base case.** Unconditional infinite recursion — will crash the moment the component mounts. It's currently unwired (removed as a side effect of the `TaskDialog` merge conflict resolution), so nothing renders it today, but the component itself is still broken and shouldn't be wired back in as-is.
- [ ] **3 pre-existing failing tests**, confirmed unrelated to today's changes (same failures in isolation on the pre-merge branch):
  - `activeTask.service.test.ts > getActiveTimer > queries by userId`
  - `timeEntry.service.test.ts > updateTimeEntry > returns NOT_FOUND when parent task is soft-deleted`
  - `timeEntry.service.test.ts > deleteTimeEntry > returns NOT_FOUND when parent task is soft-deleted`
- [ ] **`login.tsx` shows no feedback on failed login.** The error display block was removed but `errorMessage`/`ExclamationCircleIcon` are still declared, unused. Failed logins are currently silent. Restore the display or replace it with a toast (same pattern as `create-project-form.tsx`).

## Error taxonomy

- [ ] `UNEXPECTED_ERROR` in `taskHierarchyPolicy.ts` conflates two different things. The archived/deleted-ancestor checks are genuinely unreachable invariants (confirmed: cascades force descendant state, `createTask` already blocks archived/deleted parents, no reparent operation exists) — `UNEXPECTED_ERROR` is correct for those. The completion-gap check (and the analogous archive-gap/deletion-gap checks in `validateUnarchive`/`validateUndelete`) are reachable through normal use: create a new subtask under an already-completed task (creation doesn't check `completedAt` — see below), then try to complete it. That's an ordinary workflow, not a bug, and deserves its own code, e.g. `TRANSITION_INVALID`, distinct from the true assertions.

## Self-state validation gaps (tracked individually, same root cause)

- [x] ~~`createTask` didn't block adding a subtask under an already-completed parent~~ — fixed: parent lookup now also filters `completedAt: null`, matching the existing archived/deleted guards. Decided over the alternative (auto-uncomplete the ancestor chain on new-child creation) — reopening completed tasks is a deliberate future feature, not implicit default behavior.
- [ ] `completeTask`'s self-fetch only guards `deletedAt`, not `archivedAt` — a task can be completed directly while it is itself archived. Logged in `docs/ARCHITECTURE_DECISIONS.md` under "Future". Same underlying pattern as the fix above: self-state legality lives in scattered `where` clauses per operation in `task.service.ts` instead of a single place. Consider moving all self-state checks into `taskHierarchyPolicy.ts` alongside the ancestor checks, so there's actually one source of truth for hierarchy legality, not two.

## Error handling architecture

- [ ] `unwrap()`/`ServiceError` reintroduce throw-based control flow inside an otherwise return-based (`ServiceResponse`) system. Nothing stops `unwrap()` from being called outside a `serviceAction` wrapper — that throw goes uncaught. Either guard it at the type level or document the contract loudly at the top of `serviceUtil.ts`.
- [ ] Auth sits outside the typed-error/logging discipline entirely. `auth.ts`'s `authorize()` logs failures with a bare `console.log("Invalid credentials")`, not `logServiceError`. No rate limiting or lockout on repeated login attempts. Low risk solo, real gap once this is reachable by more than one person.

## Schema

- [ ] `Task.depth` is modeled, commented "for nested tasks," never set or read anywhere in `lib/`. Populate it or drop it.
- [ ] AD-13 says tasks record "the planner/distributor independently of assignees" — there's no `assigneeId` anywhere, only `createdById`. Either add the field or soften the doc to match what's actually modeled.
- [ ] No optimistic concurrency on `Task` (no version column, no conflict check). Fine solo; two people racing to complete the same task will silently last-write-wins once that's possible.

## Authorization — AD-20 policy module (decided 2026-07-02, hand-implement)

Design in `docs/ARCHITECTURE_DECISIONS.md` → AD-20. Current state: authorization lives in 19 scattered ownership checks across services — `task.service.ts` (8× `project.userId`), `project.service.ts` (6× `project.userId`), `timeEntry.service.ts` (2× `task.createdById`, 2× `entry.userId`), `activeTask.service.ts` (1× `task.createdById`). Actions do authentication only (21/21 call `auth()`); server components check sessions themselves.

- [ ] **Create `lib/authz/policy.ts`** — `Principal`, `Act` union, pure sync `can()`, `assertCan()` returning `NOT_FOUND`-masked `ServiceErrorResponse | null`. TDD: the module is pure, test it first without DB (`tests/unit/authz/policy.test.ts`).
- [ ] **Decide the ownership question the migration forces:** is time-entry authority `task.createdById` or `task.project.userId`? Identical solo, divergent under AD-13 team mode. Pick one, encode it in `can()`, note it in AD-20.
- [ ] **Migrate service by service, existing tests staying green:** `project.service.ts` → `task.service.ts` → `timeEntry.service.ts` → `activeTask.service.ts`. Each ownership `if` becomes load → `assertCan` → act.
- [ ] **Remove the loaded gun:** delete or un-export `getProjectById` (exported, zero callers, no scoping — confused-deputy shaped).
- [ ] **Update AD-18's consequences note** once migrated: missing checks in services are no longer "by design"; a service touching an owned resource without `assertCan` is a review finding.
- [ ] Optional, complementary (not part of AD-20): `withAuth` action wrapper minting a branded `AuthenticatedUserId` — kills the ~20-line per-action boilerplate and makes "forgot `auth()`" impossible. Decide separately.

## Test coverage

- [ ] Zero component/integration tests. The `TaskDialog`/`useTaskForm` bug fixed today (state disconnected across components) is exactly the class of bug the current unit-test suite structurally cannot catch, since nothing in it renders a component tree. Worth at least covering the create/edit task dialogs.
