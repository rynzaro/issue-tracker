## Session Handoff — 2026-03-09 (Task CRUD: Complete / Archive / Restore)

### Active Work

**Branch:** `task-crud` (branched from `main`)  
**Status:** Feature substantially complete. All code compiles, no TypeScript errors.  
**Not yet tested at runtime** beyond the user manually verifying in the browser during the session.

---

### Decisions Made This Session

1. **No event emission** — Iteration 2 (Event Log) is NOT STARTED per AGENT.md, so service functions don't call `emitEvent`.
2. **Complete cascades down, uncomplete propagates up** — `completeTask` sets `completedAt` on the target + all un-completed descendants (BFS). `uncompleteTask` clears only the target AND its direct parent (if parent was completed). Rationale: reopening a child implies the parent isn't done either.
3. **Archive cascades down, unarchive/restore is single-task** — `archiveTask` archives the task + all descendants in one transaction. `unarchiveTask` and `restoreDeletedTask` only operate on the single task. The archive page's parent-aware dialog guides users to restore parents first.
4. **Active timer guard on destructive operations** — complete, archive, and delete all check for active timers on descendants before proceeding. If a timer is running, the action is rejected.
5. **`archivedAt: null` filter added to active task query** — `getUserProjectWithTasks` now excludes archived tasks from the active project view.
6. **SerializableTaskNode reuse over custom types** — Archive/deleted queries return full `TaskNode[]` trees (via shared `buildTaskNodeTree`), serialized the same way as the main task tree. No separate "ArchivedTask" type.
7. **Completed tasks shown as collapsible section, not a Switch toggle** — Both at root level (in `tasksWrapper.tsx`) and within expanded children (in `tasks.tsx`), completed tasks sit behind a "Erledigte (N)" dropdown-style section with a chevron, matching the child expand/collapse pattern.
8. **Confirmation dialogs for both archive and delete** — Archive now has its own Alert confirmation dialog (same pattern as delete). Shows child count context. Delete already had one.
9. **Parent-aware restore dialogs** — `getProjectTaskParentMap` queries ALL tasks in the project to determine each task's parent state (`active`, `active_completed`, `archived`, `deleted`). The restore dialog blocks restore when the parent is in the same or opposite inactive tree, and warns when restoring under a completed parent will uncomplete it.
10. **`updatedAt` removed from project serialization** — The Prisma `Project` model has no `updatedAt` field, but the serializer was referencing it. Fixed by removing it from `SerializableProjectWithTaskTree` and `serializeProjectWithTaskTree`.
11. **Stray `| SerializableTaskNode` in hooks.ts** — Leftover from a merge/edit; removed along with the unused import.

---

### Changes Applied

| File                                                     | Nature of Change                                                                                                                                                                                                                                                      |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/schema/task.ts`                                     | Added 5 Zod schemas: `CompleteTaskSchema`, `UncompleteTaskSchema`, `ArchiveTaskSchema`, `UnarchiveTaskSchema`, `RestoreDeletedTaskSchema`                                                                                                                             |
| `lib/schema/project.ts`                                  | Removed `updatedAt` from `SerializableProjectWithTaskTree` type and serializer                                                                                                                                                                                        |
| `lib/services/task.service.ts`                           | Added `completeTask`, `uncompleteTask`, `archiveTask`, `unarchiveTask`, `restoreDeletedTask` service functions                                                                                                                                                        |
| `lib/services/project.service.ts`                        | Added `archivedAt: null` filter to `getUserProjectWithTasks`; added `buildTaskNodeTree` shared helper; added `getArchivedTasksForProject`, `getDeletedTasksForProject`, `getProjectTaskParentMap`; exported `TaskParentInfo` type                                     |
| `lib/actions/task.actions.ts`                            | Added 5 server actions: `completeTaskAction`, `uncompleteTaskAction`, `archiveTaskAction`, `unarchiveTaskAction`, `restoreDeletedTaskAction`                                                                                                                          |
| `lib/hooks.ts`                                           | Removed stray `\| SerializableTaskNode` syntax error and unused import                                                                                                                                                                                                |
| `app/s/project/[project-id]/page.tsx`                    | Added `ArchiveBoxIcon` link to archive page in project header                                                                                                                                                                                                         |
| `app/s/project/[project-id]/tasks.tsx`                   | Added `setTaskToArchive` prop; replaced direct `archiveTaskAction` calls with confirmation setter; extracted `ExpandedChildren` component with active/completed split; added exported `CompletedSection` component; removed `showCompleted` prop (no longer threaded) |
| `app/s/project/[project-id]/tasksWrapper.tsx`            | Added archive confirmation dialog (`Alert`); imported `archiveTaskAction`; split root tasks into active/completed with `CompletedSection`; removed `Switch` toggle; added `taskToArchive`/`archiveLoading` state                                                      |
| `app/s/project/[project-id]/archive/page.tsx`            | **New file** — server component with auth, parallel data fetching, two sections (archived/deleted), parentMap passing                                                                                                                                                 |
| `app/s/project/[project-id]/archive/archiveTaskList.tsx` | **New file** — client component with `getRestoreCheck` (parent-state-aware restore logic), `ArchiveTaskNode` (recursive tree), `TrashXIcon` (custom crossed-out trash), confirmation Alert with blocking/warning                                                      |

---

### Pending / Blocked

1. **No automated tests** — None of the new service functions, server actions, or UI components have test coverage yet. Priority: `completeTask`, `uncompleteTask`, `archiveTask`, `unarchiveTask`, `restoreDeletedTask` services.
2. **`uncompleteTask` side-effect on restore not wired** — The parent-aware dialog _warns_ that restoring under a completed parent will uncomplete it, but the `restoreDeletedTask` / `unarchiveTask` service functions don't actually call `uncompleteTask` on the parent. This logic needs to be added in the service layer if the restored child is not completed but the parent is.
3. **Archive page empty-state** — No empty-state message shown when there are zero archived or zero deleted tasks.
4. **Mobile responsive check** — Archive page hasn't been verified on mobile viewports.
5. **`triggerNotification()` test function** — Still present in `tasksWrapper.tsx` (lines ~155-173). Should be removed before merge.

---

### Key Context

- **Architecture pattern:** Component → Server Action → Service → Prisma. All server actions check `auth()`, validate with Zod, call service, `revalidatePath`.
- **Soft-delete pattern:** `deletedAt` for delete, `archivedAt` for archive. All active queries must filter both.
- **BFS descendant collection:** `collectDescendantIds` in `task.service.ts` is reused by complete, archive, and delete operations.
- **`buildTaskNodeTree`:** Shared between `getProjectTaskTree` (active view) and `getArchivedTasksForProject`/`getDeletedTasksForProject`. The active-view version in `getProjectTaskTree` is inline and includes timer state — consider consolidating.
- **German UI strings:** All user-facing text is in German.

---

### Continuation Plan

1. Wire the uncomplete side-effect: when `unarchiveTask` or `restoreDeletedTask` restores a non-completed child under a completed parent, call `uncompleteTask` on the parent (or clear `completedAt` directly).
2. Write tests for the 5 new service functions (use existing test patterns in `tests/unit/`).
3. Add empty-state messages to archive page.
4. Remove `triggerNotification()` from `tasksWrapper.tsx`.
5. Run full manual QA pass: complete/uncomplete/archive/unarchive/restore/delete flows.
6. Update docs (see "Undocumented patterns" section below).

---

### Files to Read First

1. `lib/services/task.service.ts` — core business logic for all task mutations
2. `lib/services/project.service.ts` — query layer, `buildTaskNodeTree`, `getProjectTaskParentMap`
3. `app/s/project/[project-id]/archive/archiveTaskList.tsx` — parent-aware restore dialog logic
4. `app/s/project/[project-id]/tasks.tsx` — `CompletedSection`, `ExpandedChildren` pattern
5. `app/s/project/[project-id]/tasksWrapper.tsx` — confirmation dialogs, root task split
