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

## Test coverage

- [ ] Zero component/integration tests. The `TaskDialog`/`useTaskForm` bug fixed today (state disconnected across components) is exactly the class of bug the current unit-test suite structurally cannot catch, since nothing in it renders a component tree. Worth at least covering the create/edit task dialogs.
