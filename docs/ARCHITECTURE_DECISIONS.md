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

### AD-8: Bidirectional status transitions

Any `TaskStatus` → any other. `completedAt` set/cleared on transitions to/from COMPLETED.

### AD-9: WORK_STARTED scoped to task

Baseline check = "no baseline on this task." Not "nearest ancestor with children" (ambiguous, unnecessary).

### AD-10: Soft delete = query filtering

`deletedAt IS NOT NULL` excluded in queries. No cascade to children, no restore. Children become orphaned.

### AD-11: No DB cascade deletes

All FKs `onDelete: Restrict`. Service code handles deletion dependencies explicitly.

### AD-12: Task.projectId required

`projectId` is now mandatory on `Task`. Every task belongs to exactly one project. Eliminates the inference chain for ownership (Task → Project → User) and ensures consistent hierarchy.

### AD-13: Task.createdById — direct ownership

`Task.createdById` is a required FK to `User`. Records who created the task, immutable. In solo mode, always the project owner. In future multi-user mode, records the planner/distributor independently of assignees.

### AD-14: Tags scoped per-user

`Tag.userId` added. Each user has their own tag vocabulary, reusable across all their projects. Enables cross-project analysis ("how are my backend estimates across all projects?"). `@@unique([name, userId])` prevents duplicate tag names per user.

### AD-15: Explicit TaskTag junction table with user attribution

Replaced implicit `Tag[] ↔ Task[]` many-to-many with explicit `TaskTag` model. Each row records `taskId`, `tagId`, and `userId` (who applied the tag). In solo mode, userId is always the current user. In future team mode, this enables dual-perspective analysis: planner tags for planning shortcomings, executor tags for execution analysis — both on the same task.

---

## Future (decide when relevant)

### Iter 1: Persistent ordering?

Position removed (AD-4). Ephemeral or persisted drag-and-drop order? If persisted, re-add `position`.

### Iter 1: Time rollup strategy

On-the-fly `SUM()` vs denormalized `trackedTime` on Task. On-the-fly likely fine for <10k tasks.

### Iter 3: Debounce = destructive replace?

Debounced checkpoint replaces snapshot → intermediate state lost. Acceptable?

### Iter 3: Checkpoints on leaf tasks?

No children → `childCount=0`, empty CheckpointTask rows. Skip or keep?

### Iter 5: Analysis without COMPLETED?

Analysis needs baseline→completion. Allow analysis on latest checkpoint if never formally completed?

### Iter 5: Root task per project?

Deferred. No perf benefit now. Revisit if project-level aggregation painful without single root.
