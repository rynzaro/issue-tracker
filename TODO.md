# Todos

> Iteration work lives in [ROADMAP.md](docs/ROADMAP.md). This file tracks cross-cutting improvements and ideas.

---

## Test Specifications — Iteration 1 CRUD

Comprehensive test coverage for Project and Task CRUD operations. Tests follow existing vitest patterns in `tests/` directory.

### Service Layer Tests

#### `tests/unit/services/project.service.test.ts`

**createProject**

- [ ] ✓ creates project with default settings when projectSettings omitted
- [ ] ✓ creates project with custom settings when provided
- [ ] ✗ returns UNEXPECTED_ERROR when userId does not exist

**getUserProjectById**

- [ ] ✓ returns project when owner requests it
- [ ] ✗ returns NOT_FOUND when project does not exist
- [ ] ✗ returns NOT_FOUND when non-owner requests it (authorization)
- [ ] ✗ returns NOT_FOUND when project is soft-deleted (deletedAt ≠ null)

**getUserProjectWithTasks**

- [ ] ✓ returns project with tasks when owner requests it
- [ ] ✓ filters out soft-deleted tasks (only tasks where deletedAt IS NULL)
- [ ] ✗ returns NOT_FOUND when non-owner requests it
- [ ] ✗ returns NOT_FOUND when project is soft-deleted

**updateProject**

- [ ] ✓ updates name when provided
- [ ] ✓ updates description when provided
- [ ] ✓ clears description when null provided
- [ ] ✓ sets isDefault=true and unsets all other user projects (transaction)
- [ ] ✓ sets isDefault=false without affecting other projects
- [ ] ✗ returns NOT_FOUND when non-owner attempts update
- [ ] ✗ returns NOT_FOUND when project does not exist
- [ ] ✗ returns NOT_FOUND when project is soft-deleted

**deleteProject**

- [ ] ✓ soft-deletes project (sets deletedAt)
- [ ] ✓ project still exists in DB but is filtered from queries
- [ ] ✗ returns NOT_FOUND when non-owner attempts delete
- [ ] ✗ returns error when any task in project has an active timer
- [ ] ✗ returns NOT_FOUND when project does not exist
- [ ] ✗ returns error when project already soft-deleted

#### `tests/unit/services/task.service.test.ts` (expand existing)

**createTask** (add these tests)

- [ ] ✓ creates root task (parentId: null)
- [ ] ✓ creates child task with valid parentId
- [ ] ✓ creates task with tags
- [ ] ✓ creates task with todoItems
- [ ] ✗ returns NOT_FOUND when project does not exist
- [ ] ✗ returns AUTHORIZATION_ERROR when user does not own project

**updateTask** (add these tests)

- [ ] ✓ updates title, description, estimate
- [ ] ✓ replaces tags (deletes old, creates new)
- [ ] ✓ handles empty tagIds array (removes all tags)
- [ ] ✗ returns NOT_FOUND when task does not exist
- [ ] ✗ returns AUTHORIZATION_ERROR when user does not own task's project

**deleteTask** (new function, new tests)

- [ ] ✓ soft-deletes task (sets deletedAt)
- [ ] ✓ cascades soft-delete to all descendants (sets deletedAt on children, grandchildren, etc.)
- [ ] ✓ verifies cascaded tasks are filtered from getUserProjectWithTasks
- [ ] ✗ returns NOT_FOUND when task does not exist
- [ ] ✗ returns AUTHORIZATION_ERROR when user does not own task's project
- [ ] ✗ returns error when task has active timer
- [ ] ✗ returns error when any descendant has active timer
- [ ] ✗ returns error when task already soft-deleted

**hasActiveTimers** (existing — ensure coverage is complete)

- [x] ✓ returns false when no active timers on task or descendants
- [x] ✓ returns true when task itself has active timer
- [x] ✓ returns true when descendant has active timer
- [x] ✗ returns NOT_FOUND when task does not exist

### Action Layer Tests

#### `tests/unit/actions/project.actions.test.ts` (expand existing)

**All actions** (cross-cutting)

- [ ] ✗ returns AUTHORIZATION_ERROR when session is null
- [ ] ✗ returns AUTHORIZATION_ERROR when session.user.id is undefined

**createProjectAction** (add these tests)

- [ ] ✓ validates input with CreateProjectSchema
- [ ] ✓ calls createProject service with userId
- [ ] ✓ revalidates '/s/main' path on success
- [ ] ✗ returns validation error for invalid input (name too short, description too long, etc.)

**updateProjectAction** (new function, new tests)

- [ ] ✓ validates input with UpdateProjectSchema
- [ ] ✓ calls updateProject service
- [ ] ✓ revalidates '/s' layout on success
- [ ] ✗ returns validation error for invalid projectId (not cuid)
- [ ] ✗ returns validation error when name/description violate constraints

**deleteProjectAction** (new function, new tests)

- [ ] ✓ validates projectId is cuid
- [ ] ✓ calls deleteProject service with userId
- [ ] ✓ revalidates '/s' layout on success
- [ ] ✗ returns validation error for invalid projectId

**getUserProjectWithTasksAndChildrenAction** (existing — ensure coverage complete)

- [x] ✓ computes totalTimeSpent from timeEntries durations
- [x] ✓ recursively sums totalTimeSpent for parent tasks
- [ ] ✓ filters soft-deleted tasks from tree
- [ ] ✓ orphaned tasks (parent deleted) do not appear in tree

#### `tests/unit/actions/task.actions.test.ts` (new file)

**All actions**

- [ ] ✗ returns AUTHORIZATION_ERROR when session is null

**createTaskAction** (existing — add tests if missing)

- [ ] ✓ validates input with CreateTaskSchema
- [ ] ✓ calls createTask service
- [ ] ✓ revalidates '/s/project' layout
- [ ] ✗ returns validation error for invalid input

**updateTaskAction** (existing — add tests if missing)

- [ ] ✓ validates input with UpdateTaskSchema
- [ ] ✓ calls updateTask service
- [ ] ✓ revalidates '/s/project' layout
- [ ] ✗ returns validation error for invalid input

**deleteTaskAction** (new function, new tests)

- [ ] ✓ validates taskId is cuid
- [ ] ✓ calls deleteTask service with userId
- [ ] ✓ revalidates '/s/project' layout on success
- [ ] ✗ returns validation error for invalid taskId

### Integration Tests

#### `tests/integration/project-crud-flow.test.ts` (new file)

- [ ] **Full project lifecycle**: create → read → update (name, description) → update (isDefault=true) → delete → verify filtered from queries
- [ ] **isDefault toggle**: create project A (isDefault=false) → create project B (isDefault=true) → verify A remains false → set A to isDefault=true → verify B now false
- [ ] **Multi-user isolation**: user A creates/deletes project → user B's projects unaffected
- [ ] **Delete with tasks**: create project → create tasks → attempt delete with active timer → stop timer → delete succeeds → tasks also soft-deleted

#### `tests/integration/task-crud-flow.test.ts` (new file)

- [ ] **Full task lifecycle**: create root → create child → create grandchild → update child title → delete root → verify all cascade-deleted
- [ ] **Cascade delete verification**: create hierarchy (A → B → C → D) → delete B → verify C and D cascade-deleted → verify A remains
- [ ] **Active timer guard**: create task → start timer → attempt delete → verify error → stop timer → delete succeeds
- [ ] **Filter verification**: delete task → query getUserProjectWithTasks → verify task not in results
- [ ] **Multi-user isolation**: user A deletes task in their project → user B's tasks unaffected

#### `tests/integration/soft-delete-filtering.test.ts` (new file)

- [ ] **Project filtering**: soft-delete project → getUserProjectById returns NOT_FOUND → getProjectsByUser excludes it → direct DB query shows deletedAt is set
- [ ] **Task filtering**: soft-delete task → getUserProjectWithTasks excludes it → parent task's children array excludes it
- [ ] **Cascade filtering**: delete parent with 3 children → getAllTasks for project shows none of the 4 tasks
- [ ] **Active timer query**: soft-delete task with active timer → hasActiveTimers on project returns false (because task is filtered)

---

## Post-MVP Technical Improvements

Tackle after Iteration 1 ships. These are engineering quality investments, not user-facing features.

- [ ] **Zod-driven client validation** — Reuse `CreateTaskSchema` / `UpdateTaskSchema` on the client (via `safeParse`) instead of duplicating validation rules in `useTaskForm.validateForm()`. Single source of truth for field rules. Consider `react-hook-form` + `zodResolver` if form count grows beyond 3-4.
- [ ] **Shared `TaskFormFields` component** — Extract the duplicated field markup (title + estimatedDuration + description + error display) from `newRootTask.tsx` and `tasksWrapper.tsx` (3 copies total) into a single `TaskFormFields` component that takes `values` + `setValues` props.
- [ ] **Multi-user test fixtures** — Seed 2 users with overlapping projects/tasks. Run every service mutation as user A, assert user B's data is untouched. Catches data isolation bugs (like the `deleteMany: {}` scope leak) in CI before they ship.
- [ ] **Auto-generated schema docs** — Generate the "Target Schema" section in ROADMAP.md from `prisma/schema.prisma` (e.g. a script or Prisma generator). Eliminates doc drift — the schema in docs and the actual schema can never diverge.

---

## UX Ideas

Captured from earlier brainstorming. Prioritize when relevant.

- [ ] fix mobile version text sizes and buttons (thinking of a popup menu instead of buttons and just having start and stop visible, so the task + times can be large)
- [ ] Deletion / Archiving architecture + impact of tasks -- do we need deletion AND archiving?
- [ ] Notification system (success/error toasts after mutations) — replace inline error text blobs with proper toast notifications (e.g. `react-hot-toast` or custom). Cover all server action calls.
- [x] Default project functionality (auto-select on login) — implemented: `/s/main` redirects to default project, star button on project header to set default
- [ ] User settings page — dedicated page or modal for per-user preferences (default project, notification prefs, display settings)
- [ ] Project selection architecture (navbar dropdown vs sidebar vs dedicated page)
- [ ] Button hover explanations (tooltips)
- [ ] Estimated duration input — explore scroll/stepper input instead of plain text field
