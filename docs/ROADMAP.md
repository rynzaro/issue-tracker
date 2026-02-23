# Roadmap

Current state and planned work. Check off items as they're completed.

## Done

- [x] Next.js 16 project scaffolded
- [x] Tailwind CSS 4 + HeadlessUI configured
- [x] MariaDB via Docker Compose
- [x] Prisma 7 ORM connected (adapter-mariadb)
- [x] NextAuth 5 with credentials provider + bcrypt
- [x] Auth middleware (proxy.ts)
- [x] Protected route layout (`app/s/layout.tsx`)
- [x] Login page + server action
- [x] Sign-up page + account creation API route
- [x] Logout page
- [x] Forgot password page (UI only)
- [x] Shared component library (button, input, dialog, dropdown, table, sidebar, navbar, etc.)
- [x] Bare Prisma schema (User, Project, Task)
- [x] Documentation (DEVELOPER.md, AGENT.md, USER.md, ROADMAP.md)

---

## Iteration 0 — Schema + Foundation

Rewrite the Prisma schema with the full data model and reorganize the codebase.

- [x] Rewrite `prisma/schema.prisma` with all 8 models + 4 enums (see Target Schema below)
- [x] Add soft delete support (`deletedAt` field on Task, non-cascading, no restore, orphaned children remain)
- [x] Run initial migration
- [x] Move Toggl code from `lib/util.ts`, `lib/types.ts`, `lib/consts.ts` → `lib/toggl/`
- [x] Clean `lib/util.ts` — keep only generic utilities (`validatePassword`, `createErrorResponse`, `parseTaskString`)
- [x] Clean `lib/types.ts` — remove Toggl types, add app-level types
- [x] Delete `lib/consts.ts` (Toggl-only, moved to `lib/toggl/consts.ts`)
- [x] Consolidate error types (duplicated between `lib/errors.ts` and `lib/util.ts`)
- [x] Move `lib/actions.ts` → `lib/actions/auth.actions.ts`
- [x] Create service skeletons: `lib/services/{project,task,timeEntry,event,checkpoint,todo,analysis}.service.ts`
- [x] Create action skeletons: `lib/actions/{project,task,timeEntry,checkpoint,todo,user}.actions.ts`
- [x] Remove Toggl env vars from any remaining references (already cleaned from `.env`)

## Iteration 1 — Task Tracking MVP

Core task management with time tracking. The first usable version of the app.

- [x] `project.service.ts` + `project.actions.ts`
- [x] `task.service.ts` + `task.actions.ts`
- [x] Self-referential task hierarchy (parentId, depth)
- [x] Task tree UI (`app/s/project/[project-id]/page.tsx`)
- [x] Inline estimate editing (minutes)
- [x] Task description / notes field
- [x] Time tracking: start/stop timer (AD-16 + AD-17: ActiveTimer table, single active task)
- [x] `timeEntry.service.ts` + `timeEntry.actions.ts`
- [x] ActiveTimer model + migration (AD-17: `@@unique([userId])`, mandatory `stoppedAt`/`duration` on TimeEntry)
- [x] Auto-stop previous timer when starting a new one (handled by ActiveTimer swap in transaction)
- [x] Time rollup: parent shows sum of children's tracked time (on-the-fly `SUM()` query, acceptable for <10k tasks)
- [x] Replace legacy `app/s/[workspaceId]/` with `app/s/project/[project-id]/`
- [ ] Project CRUD (create, list, edit, delete)
- [ ] Project listing selection box in navbar
- [ ] Task CRUD (create, edit, delete)
- [ ] Task tags field (M:N, optional)
- [ ] Task status transitions: set/clear `completedAt` (complete/uncomplete), set/clear `archivedAt` (archive/unarchive); add `archivedAt DateTime?` to Task schema
- [ ] Active timer display in navbar
- [ ] Delete legacy Toggl API routes (`create-tag/`, `create-tag-without-permission/`, `start-new-entry/`) or move to `app/api/toggl/`
- [ ] optional: Task ordering

## Iteration 2 — Event Log

Passive audit trail on all task mutations.

- [ ] `event.service.ts` — generic `emitEvent(taskId, type, payload)` function
- [ ] Add `emitEvent()` calls in `task.service.ts` for: ESTIMATE_SET, ESTIMATE_CHANGED, SUBTASK_CREATED, SUBTASK_REMOVED, TASK_STARTED, TASK_COMPLETED, TASK_STATUS_CHANGED, TAGS_CHANGED (payload: `{ added: string[], removed: string[] }`)
- [ ] Add `emitEvent()` calls in `timeEntry.service.ts` for: TASK_STARTED
- [ ] Event history view (per-task, read-only timeline)

## Iteration 3 — Checkpoint System

Auto + manual checkpoints with user settings.

- [ ] `checkpoint.service.ts` — createCheckpoint, debounceOrCreate, updateSnapshot, getCheckpointHistory
- [ ] Checkpoint creation: snapshot task + direct children (estimate, tracked time, status per child)
- [ ] Baseline concept: first WORK_STARTED checkpoint on **this task** gets `isBaseline = true` (scoped per-task, not per-hierarchy)
- [ ] add "use current state as baseline" option
- [ ] `existedAtBaseline` flag on CheckpointTask (enables scope/effort decomposition later)
- [ ] Auto-checkpoint triggers in `task.service.ts`: SCOPE_CHANGE (add/remove child after baseline), ESTIMATE_CHANGE
- [ ] Auto-checkpoint triggers in `timeEntry.service.ts`: WORK_STARTED (only if this task has no baseline)
- [ ] Auto-checkpoint on TASK_COMPLETED
- [ ] Scoping: checkpoints fire for changed task + direct parent, NEVER grandparent+
- [ ] Debounce window (default 30 min): group rapid changes into single checkpoint (destructive: intermediate checkpoints within window are lost)
- [ ] Manual "Save Checkpoint" button
- [ ] Project settings page (`app/s/[projectId]/settings/page.tsx`):
  - [ ] Auto-checkpoints on/off (per-project toggle)
  - [ ] Per-trigger toggles (scope change, estimate change)
  - [ ] Debounce window (minutes)
- [ ] **Decision**: Create CheckpointTask rows for leaf tasks (no children) or skip? (affects data size)
- [ ] Checkpoint history view per task

## Iteration 4 — TodoItem + Conversion

Lightweight checklists that can become full sub-tasks.

- [ ] `todo.service.ts` + `todo.actions.ts`
- [ ] TodoItem CRUD (add, edit, check/uncheck, reorder, delete)
- [ ] Optional estimate field on TodoItem (minutes)
- [ ] Todo checklist UI on task detail view
- [ ] Convert todo → sub-task: creates Task with todo's text as title, carries over estimate
- [ ] Conversion triggers SCOPE_CHANGE checkpoint (if baseline exists)
- [ ] `convertedToTaskId` link on TodoItem (tracks conversion lineage)
- [ ] Emit TODO_ADDED, TODO_COMPLETED, TODO_CONVERTED events

## Iteration 5 — Analysis Dashboard

Scope vs effort error decomposition and accuracy metrics.

- [ ] `analysis.service.ts`
- [ ] Compare baseline checkpoint to completion checkpoint (or latest checkpoint if task never completed)
- [ ] **Decision**: Allow analysis on incomplete tasks using latest checkpoint?
- [ ] Scope error calculation: time on tasks where `existedAtBaseline = false`
- [ ] Effort error calculation: overrun on tasks where `existedAtBaseline = true`
- [ ] Per-task accuracy breakdown
- [ ] Percentage split (e.g., "62% scope error, 38% effort error")
- [ ] Analysis dashboard UI (`app/s/[projectId]/analysis/`)
- [ ] Trend visualization (accuracy over time across projects)

## Iteration 6 — Toggl Integration

Optional tag sync and time entry import/export using per-user tokens.

- [ ] `lib/toggl/api.ts` — reads token from User model, never env vars
- [ ] `lib/toggl/types.ts` + `lib/toggl/consts.ts`
- [ ] Settings page: Toggl API token input + workspace selector
- [ ] Link tasks to Toggl tags (`togglTagId`, `togglTagName` on Task)
- [ ] Push tasks as Toggl tags
- [ ] Import time entries from Toggl
- [ ] Toggl API proxy routes in `app/api/toggl/`

---

## Target Architecture

### Code Flow Pattern

```
Component → Server Action → Service → Prisma
                               ↓
                          Event Service (emit)
                               ↓
                      Checkpoint Service (trigger)
```

- **Services** (`lib/services/`): All business logic. Pure functions using Prisma client.
- **Server Actions** (`lib/actions/`): Thin auth-checking wrappers around services. `"use server"` directive.
- **Server Components**: Call services directly for reads. No API routes needed.

### Target Directory Structure

```
issue-tracker/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/
│   │   ├── create-account/
│   │   └── toggl/                    # Optional Toggl API proxies (iter 6)
│   ├── public/
│   │   ├── login/
│   │   ├── sign-up/
│   │   └── forgot-password/
│   └── s/
│       ├── layout.tsx
│       ├── main/page.tsx             # Project listing
│       ├── logout/page.tsx
│       └── [projectId]/
│           ├── page.tsx              # Task tree view (iter 1)
│           ├── components/
│           ├── settings/page.tsx     # Project settings (iter 3)
│           ├── checkpoints/          # Checkpoint history (iter 3)
│           └── analysis/             # Analysis dashboard (iter 5)
├── components/
├── lib/
│   ├── prisma.ts
│   ├── types.ts
│   ├── errors.ts
│   ├── util.ts
│   ├── formUtils.ts
│   ├── services/
│   │   ├── project.service.ts
│   │   ├── task.service.ts
│   │   ├── timeEntry.service.ts
│   │   ├── event.service.ts
│   │   ├── checkpoint.service.ts
│   │   ├── todo.service.ts
│   │   └── analysis.service.ts
│   ├── actions/
│   │   ├── auth.actions.ts
│   │   ├── project.actions.ts
│   │   ├── task.actions.ts
│   │   ├── timeEntry.actions.ts
│   │   ├── checkpoint.actions.ts
│   │   ├── todo.actions.ts
│   │   └── user.actions.ts
│   └── toggl/                        # Isolated Toggl (iter 6)
│       ├── api.ts
│       ├── types.ts
│       └── consts.ts
└── prisma/
    └── schema.prisma
```

### Target Schema

```
User {
  id: String @id @default(cuid())
  email: String @unique
  password: String
  togglApiToken: String?
}

Project {
  id: String @id @default(cuid())
  name: String
  description: String?
  userId: String → User
  projectSettingsId: Int @unique → ProjectSettings
  tasks: Task[]
  checkpoints: Checkpoint[]
  isDefault: Boolean @default(false)
  createdAt: DateTime @default(now())
  deletedAt: DateTime?
}

ProjectSettings {
  id: Int @id @default(autoincrement())
  autoCheckpointsEnabled: Boolean @default(true)
  autoCheckpointOnScopeChange: Boolean @default(true)
  autoCheckpointOnEstimateChange: Boolean @default(true)
  checkpointDebounceMinutes: Int @default(30)
  project: Project?
}

Task {
  id: String @id @default(cuid())
  projectId: String → Project
  createdById: String → User (AD-13: immutable creator)
  parentId: String? → Task (self-ref "SubTasks")
  title: String
  description: String?
  estimate: Int? (MINUTES)
  depth: Int?
  togglTagId: Int?
  togglTagName: String?
  createdAt: DateTime @default(now())
  updatedAt: DateTime @updatedAt
  completedAt: DateTime?          // set when task is completed, cleared on uncomplete
  archivedAt: DateTime?           // set when task is archived, cleared on unarchive
  deletedAt: DateTime?            // soft delete — set only, never cleared
}

Tag {
  id: Int @id @default(autoincrement())
  name: String
  userId: String → User (AD-14: per-user tags, cross-project)
  taskTags: TaskTag[]
  @@unique([name, userId])
}

TaskTag {
  id: String @id @default(cuid())
  taskId: String → Task
  tagId: Int → Tag
  userId: String → User (AD-15: who applied the tag)
  createdAt: DateTime @default(now())
  @@unique([taskId, tagId])
}

TimeEntry {
  id: String @id @default(cuid())
  taskId: String → Task
  userId: String → User
  startedAt: DateTime
  stoppedAt: DateTime
  duration: Int (SECONDS, computed on creation)
  createdAt: DateTime @default(now())
}

ActiveTimer {
  id: String @id @default(cuid())
  userId: String @unique → User (AD-17: one active timer per user)
  taskId: String → Task
  startedAt: DateTime
  createdAt: DateTime @default(now())
}

TodoItem {
  id: Int @id @default(autoincrement())
  taskId: String → Task ("TaskTodos")
  title: String
  estimate: Int? (MINUTES)
  convertedToTaskId: String? @unique → Task ("ConvertedTodoItem")
  isCompleted: Boolean @default(false)
  createdAt: DateTime @default(now())
}

TaskEvent {
  id: String @id @default(cuid())
  taskId: String → Task
  eventType: TaskEventType
  payload: Json
  createdAt: DateTime @default(now())
}

Checkpoint {
  id: String @id @default(cuid())
  projectId: String → Project
  taskId: String → Task ("CheckpointOwner")
  trigger: CheckpointTrigger
  label: String?
  isBaseline: Boolean @default(false)
  childCount: Int
  estimatedTotal: Int? (MINUTES)
  trackedTotal: Int (SECONDS)
  ownEstimate: Int? (MINUTES)
  newChildrenSinceBaseline: Int @default(0)
  createdAt: DateTime @default(now())
}

CheckpointTask {
  id: String @id @default(cuid())
  checkpointId: String → Checkpoint
  taskId: String → Task
  estimate: Int? (MINUTES)
  trackedSoFar: Int (SECONDS)
  existedAtBaseline: Boolean
  addedAtCheckpointId: String? → Checkpoint
  createdAt: DateTime @default(now())
  @@unique([checkpointId, taskId])
}

enum TaskEventType {
  ESTIMATE_SET
  ESTIMATE_CHANGED
  SUBTASK_CREATED
  SUBTASK_REMOVED
  TODO_ADDED
  TODO_CONVERTED
  TODO_COMPLETED
  TASK_STARTED
  TASK_COMPLETED
  TASK_STATUS_CHANGED
  TAGS_CHANGED
  CHECKPOINT_CREATED
}

enum CheckpointTrigger {
  MANUAL
  WORK_STARTED
  SCOPE_CHANGE
  ESTIMATE_CHANGE
  TASK_COMPLETED
}
```

### Entity Relationships

```
User ──1:N──> Project ──1:N──> Task ──1:N──> TimeEntry
  │                │              │
  ├──1:N──> TimeEntry  │         ├──self──> Task (children)
  ├──1:1──> ActiveTimer│         ├──M:N──> Tag (via TaskTag)
  │                │              ├──1:N──> TodoItem (with optional estimate)
  │                │              ├──1:N──> TaskEvent
  │                │              └──1:N──> Checkpoint ──1:N──> CheckpointTask ──N:1──> Task
  │                │
  │                ├──1:1──> ProjectSettings
  └──1:N──> Project ──1:N──> Checkpoint
```

### Checkpoint Scoping Rule

Checkpoints scope to **task + direct parent, NEVER higher**:

- Task C changes → checkpoint on C ✅, checkpoint on B (parent) ✅, checkpoint on A (grandparent) ❌

### Checkpoint Triggers

| Trigger           | When                                                                              |
| ----------------- | --------------------------------------------------------------------------------- |
| `WORK_STARTED`    | First timer on **this task** with no baseline (becomes baseline); scoped per-task |
| `SCOPE_CHANGE`    | Sub-task added/removed after baseline exists on this task                         |
| `ESTIMATE_CHANGE` | Any estimate value changes                                                        |
| `TASK_COMPLETED`  | Task marked done                                                                  |
| `MANUAL`          | User clicks "Save Checkpoint"                                                     |

Auto-checkpoints debounced (30 min default), toggleable per trigger in project settings.

### Iteration Dependencies

```
0 ──> 1 ──> 2 ──> 3 ──> 5
                   │
                   └──> 4

6 depends on 1 (can be done anytime after 1)
```
