## Session Handoff — 2026-02-23

### Active Work

Implementing **Project CRUD + Task CRUD** for Iteration 1. A 12-step plan was fully implemented, then reviewed twice. All important+moderate issues are fixed. Remaining: 3 new review findings + 9 deferred minor issues.

Branch: `feat/8-implement-start-task-functionality`
All changes are unstaged.

### Decisions Made This Session

1. **AD-10 updated**: Cascade soft-delete to all descendants via BFS in service code (not DB cascades). Applied to both tasks and projects.
2. **isDefault is "set-only"**: Can't uncheck via UI. `updateProject` ignores `isDefault: false`.
3. **Removed `listProjectsAction`**: Main page uses direct `getProjectsByUser` service call (Rule 3).
4. **Removed `serviceQueryOrNotFound`**: Replaced with explicit `serviceAction` + null checks.
5. **Tree logic extracted**: `getProjectTaskTree` moved from action to `project.service.ts`.
6. **Broad revalidation**: Using `revalidatePath('/s', 'layout')` for project mutations, `revalidatePath('/s/project', 'layout')` for task mutations.
7. **UI language is German** throughout. Error messages in services can be German (user-facing) or English (internal).

### Changes Applied

- `lib/services/task.service.ts` — Removed dual import, extracted `collectDescendantIds` BFS helper, added `deleteTask` with cascade, added `deletedAt: null` checks to create/update/hasActiveTimers
- `lib/services/project.service.ts` — Added `updateProject`, `deleteProject` (cascade + transaction), `getProjectTaskTree`. Added `deletedAt: null` filtering to all queries. Typed spread in updateProject.
- `lib/actions/project.actions.ts` — Added `updateProjectAction`, `deleteProjectAction`. Simplified `getUserProjectWithTasksAndChildrenAction` to delegate to service. Removed `listProjectsAction`.
- `lib/actions/task.actions.ts` — Added `deleteTaskAction` with cuid validation.
- `lib/schema/project.ts` — Added `UpdateProjectSchema` + `UpdateProjectParams`.
- `app/s/main/page.tsx` — Rewritten: auth → getProjectsByUser → project card grid.
- `app/s/project/[project-id]/page.tsx` — Direct `getProjectTaskTree` service call, auth, settings Cog link.
- `app/s/project/[project-id]/tasks.tsx` — Added `setTaskToDelete` prop + TrashIcon onClick.
- `app/s/project/[project-id]/tasksWrapper.tsx` — Added delete dialog (Alert), `handleDeleteTask`, state.
- `app/s/project/[project-id]/settings/page.tsx` — NEW: project settings server component.
- `app/s/project/[project-id]/settings/updateProjectForm.tsx` — NEW: client component for project update.
- `app/s/project/[project-id]/settings/deleteProjectSection.tsx` — NEW: danger zone delete section.
- `docs/ARCHITECTURE_DECISIONS.md` — Updated AD-10 (cascade) and AD-11 (no DB cascades).
- `docs/ROADMAP.md` — Expanded Project CRUD and Task CRUD checklist items.
- `TODO.md` — Added comprehensive test specifications.

### Pending — Open Issues (12 total)

#### From Review #2 (3 new issues)

**R2-1 — IMPORTANT: createTask cross-project parent reference**

- File: `lib/services/task.service.ts`, `createTask` function (~line 73)
- Bug: Parent task check doesn't verify `projectId` matches. `createTask({ projectId: A, parentId: taskInProjectB })` succeeds.
- Fix: Add `projectId: createTaskParams.projectId` to the parent task `findUnique` where clause.

**R2-2 — MODERATE: deleteTask misleading atomicity comment**

- File: `lib/services/task.service.ts`, `deleteTask` function (~line 197)
- Comment says "Transaction: check active timers + soft-delete atomically" but timer check + updateMany are NOT in `$transaction`.
- Fix: Either wrap in `$transaction` or fix the comment. Race window is tiny for single-user.

**R2-3 — MINOR: getProjectTaskTree serializes raw timeEntries**

- File: `lib/services/project.service.ts`, `getProjectTaskTree` (~line 275)
- `{ ...task }` spread copies `timeEntries` array into TaskNode objects, serialized to client unnecessarily.
- Fix: Destructure `{ timeEntries, ...taskData } = task` before spreading.

#### From Review #1 (9 deferred minor issues)

**R1-1 — "Task Manager" subheading in English**

- File: `app/s/project/[project-id]/page.tsx`, line ~49
- Should be German (e.g. "Aufgabenverwaltung")

**R1-2 — `isDefault: false` accepted by schema but ignored by service**

- File: `lib/schema/project.ts` (UpdateProjectSchema)
- Schema accepts `isDefault: false` but service silently ignores it. Add a comment or restrict schema.

**R1-3 — revalidatePath runs regardless of success/failure**

- Files: `lib/actions/project.actions.ts` (3 actions), `lib/actions/task.actions.ts` (3 actions)
- Fix: `if (result.success) revalidatePath(...)`

**R1-4 — No cuid validation on read actions**

- File: `lib/actions/project.actions.ts` — `getUserProjectByIdAction`, `getUserProjectWithTasksAction` accept raw string
- Fix: Add `z.string().cuid().safeParse(projectId)` guard

**R1-5 — No client-side validation in updateProjectForm**

- File: `app/s/project/[project-id]/settings/updateProjectForm.tsx`
- Empty name submits to server. Add min-length check before submit.

**R1-6 — Form submits when no fields changed**

- File: `app/s/project/[project-id]/settings/updateProjectForm.tsx`
- Sends no-op update. Disable submit button when form is pristine.

**R1-7 — Description imported from @headlessui/react directly**

- File: `app/s/project/[project-id]/settings/updateProjectForm.tsx`
- Should use project's component wrapper if one exists. Check `components/` for a Description wrapper.

**R1-8 — `loading` prop unused in tasks.tsx**

- File: `app/s/project/[project-id]/tasks.tsx`
- Prop is passed but never used in the component body. Remove or use it.

**R1-9 — TODO error handling comments in create/update dialogs**

- File: `app/s/project/[project-id]/tasksWrapper.tsx`
- Two `// TODO error handling` comments after `submitCreate` and `submitUpdate`. Implement inline error display.

### Key Context

- **Stack**: Next.js 16 App Router, React 19, Prisma 7, MariaDB, NextAuth 5, Tailwind 4, Zod
- **Architecture**: Services → Actions → Components. Rule 1: business logic in services. Rule 2: mutations via actions. Rule 3: reads via direct service calls.
- **Service wrappers**: `serviceAction()` for complex ops, `serviceQuery()` for simple reads. Both in `lib/services/serviceUtil.ts`.
- **ActiveTimer**: `@@unique([userId])`. Must check for active timers before deleting tasks/projects.
- **Soft-delete**: AD-10 cascade via BFS. All queries filter `deletedAt IS NULL`. No restore UI.
- **UI language**: German throughout. No toast system.
- **Zero TypeScript errors** as of last check across all modified files.

### Continuation Plan

1. Fix R2-1 (createTask cross-project parent — important, 1 line)
2. Fix R2-2 (deleteTask atomicity — moderate, wrap in $transaction or fix comment)
3. Fix R2-3 (destructure timeEntries — minor, 3 lines)
4. Fix R1-1 through R1-9 (9 minor issues, batch them)
5. Run `get_errors` across all modified files
6. Check off ROADMAP.md items that are now complete
7. Optionally: run another review pass

### Files to Read First

1. `docs/AGENT.md` — architecture rules
2. `lib/services/task.service.ts` — main service with BFS helper, CRUD, the important bug
3. `lib/services/project.service.ts` — project services including getProjectTaskTree
4. `lib/actions/project.actions.ts` — action layer
5. `lib/actions/task.actions.ts` — task actions
6. `app/s/project/[project-id]/page.tsx` — project detail page
7. `app/s/project/[project-id]/settings/updateProjectForm.tsx` — form with minor issues
8. `app/s/project/[project-id]/tasksWrapper.tsx` — delete dialog + TODO comments
