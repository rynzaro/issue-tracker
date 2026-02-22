# Agent Instructions

Instructions for AI agents working on this codebase. Read this BEFORE making any changes.

> **Important**: Rules 1-3 apply after Iteration 0 (service/action structure created). Rules 4+ apply after their respective iterations (Event Log after iter 2, Checkpoints after iter 3). Check the Iteration Status table at the bottom to know which rules are active.

## Quick Orientation

**What this app does**: Time tracking with estimation accuracy analysis. Users create hierarchical tasks, set time estimates, track time, and the system analyzes where estimates went wrong (scope errors vs effort errors).

**Tech**: Next.js 16 App Router, React 19, Prisma 7, MariaDB, NextAuth 5, Tailwind 4, Zod.

**Current state**: Check the iteration status table at the bottom of this file to understand what's implemented.

## Architecture Rules (MUST Follow)

### 1. Business Logic in Services Only

All business logic lives in `lib/services/*.service.ts`. These are pure functions that use the Prisma client. **Never** put business logic in API routes, Server Actions, or components.

```
Component → Server Action → Service → Prisma
                               ↓
                          Event Service (emit)
                               ↓
                      Checkpoint Service (trigger)
```

### 2. Mutations via Server Actions

All data mutations go through Server Actions (`lib/actions/*.actions.ts`). Every action file starts with `"use server"`.

Server Actions must:

1. Call `auth()` and verify the session
2. Validate input (Zod if needed)
3. Call the appropriate service function
4. Call `revalidatePath()` for affected pages
5. Return the result

```typescript
"use server";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { someService } from "@/lib/services/some.service";

export async function someAction(params: SomeParams) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const result = await someService(params);
  revalidatePath("/s/...");
  return result;
}
```

### 3. Reads via Direct Service Calls in Server Components

Server Components fetch data by calling service functions directly. No API routes needed for reads.

```typescript
// app/s/[projectId]/page.tsx (Server Component)
import { getTaskTree } from "@/lib/services/task.service";

export default async function Page({ params }) {
  const tasks = await getTaskTree((await params).projectId);
  return <TaskTreeClient tasks={tasks} />;
}
```

### 4. Every Mutation Must Emit a TaskEvent

After iteration 2, every data mutation in a service MUST emit a corresponding TaskEvent. This is the audit trail.

```typescript
// Inside task.service.ts
await client.task.update({ where: { id }, data: { estimate: newEstimate } });
await emitEvent(id, "ESTIMATE_CHANGED", { old: oldEstimate, new: newEstimate });
```

Event types and when to emit:

| Event                 | When                                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| `ESTIMATE_SET`        | First time an estimate is set on a task (was null, now has value)                                     |
| `ESTIMATE_CHANGED`    | Estimate changed from one value to another                                                            |
| `SUBTASK_CREATED`     | A child task is created                                                                               |
| `SUBTASK_REMOVED`     | A child task is deleted                                                                               |
| `TODO_ADDED`          | A TodoItem is added to a task                                                                         |
| `TODO_CONVERTED`      | A TodoItem is converted to a sub-task                                                                 |
| `TODO_COMPLETED`      | A TodoItem is checked off                                                                             |
| `TASK_STARTED`        | First TimeEntry ever created for this task (AD-16: only the explicitly-started task gets a TimeEntry) |
| `TASK_COMPLETED`      | `completedAt` is set on a task (task marked done)                                                     |
| `TASK_STATUS_CHANGED` | `archivedAt` is set or cleared on a task                                                              |
| `TAGS_CHANGED`        | Tags added and removed from the Task                                                                  |
| `CHECKPOINT_CREATED`  | A checkpoint is created                                                                               |

#### TaskEvent Payload Specifications

Each event's `payload` field contains structured data. Validate with Zod in `event.service.ts` before inserting.

| Event                 | Payload Schema                                                                  | Example                                                                              |
| --------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `ESTIMATE_SET`        | `{ value: number }` (minutes)                                                   | `{ "value": 120 }`                                                                   |
| `ESTIMATE_CHANGED`    | `{ old: number, new: number }` (minutes)                                        | `{ "old": 120, "new": 180 }`                                                         |
| `SUBTASK_CREATED`     | `{ childTaskId: string, childTitle: string }`                                   | `{ "childTaskId": "cuid123", "childTitle": "Design API" }`                           |
| `SUBTASK_REMOVED`     | `{ childTaskId: string, childTitle: string }`                                   | `{ "childTaskId": "cuid123", "childTitle": "Design API" }`                           |
| `TASK_STATUS_CHANGED` | `{ field: "archivedAt", oldValue: ISO8601 \| null, newValue: ISO8601 \| null }` | `{ "field": "archivedAt", "oldValue": null, "newValue": "2026-02-18T14:30:00Z" }`    |
| `TASK_COMPLETED`      | `{ completedAt: ISO8601 datetime }`                                             | `{ "completedAt": "2026-02-18T14:30:00Z" }`                                          |
| `TAGS_CHANGED`        | `{ removed: string[], added: string[] }`                                        | `{ "removed": ["backend", "devops"], "added": ["frontend"] }`                        |
| `TASK_STARTED`        | `{ timeEntryId: string, startedAt: ISO8601 datetime }`                          | `{ "timeEntryId": "cuid456", "startedAt": "2026-02-18T14:00:00Z" }`                  |
| `TODO_ADDED`          | `{ todoItemId: string, title: string, estimate: number \| null }`               | `{ "todoItemId": "cuid789", "title": "Write tests", "estimate": 30 }`                |
| `TODO_COMPLETED`      | `{ todoItemId: string, isCompleted: boolean }`                                  | `{ "todoItemId": "cuid789", "isCompleted": true }`                                   |
| `TODO_CONVERTED`      | `{ todoItemId: string, newTaskId: string, newTaskTitle: string }`               | `{ "todoItemId": "cuid789", "newTaskId": "cuid999", "newTaskTitle": "Write tests" }` |
| `CHECKPOINT_CREATED`  | `{ checkpointId: string, trigger: CheckpointTrigger, isBaseline: boolean }`     | `{ "checkpointId": "cp123", "trigger": "WORK_STARTED", "isBaseline": true }`         |

**Notes:**

- All timestamps are ISO8601 format (`YYYY-MM-DDTHH:mm:ssZ`).
- Enum fields (`CheckpointTrigger`) use their string values.
- IDs are CUIDs.
- Null values are allowed where indicated.
- Validate payload shape in `event.service.ts` with Zod before calling the DB `create()`.

### 5. Checkpoint Scoping: Task + Parent, NEVER Higher

When a change triggers an auto-checkpoint, create checkpoints for:

- **The changed task itself** (snapshots its children)
- **The changed task's direct parent** (snapshots the parent's children, including the changed task)
- **NEVER the grandparent or any higher ancestor**

Example: Task hierarchy A → B → C. When C's estimate changes:

- Checkpoint on C ✅ (captures C + C's children)
- Checkpoint on B ✅ (captures B's children, including C)
- Checkpoint on A ❌ (NEVER — do not cascade higher)

### 6. Checkpoint Auto-Trigger Rules

After iteration 3, services must check whether to create auto-checkpoints. The logic:

```typescript
async function checkAutoCheckpoint(
  taskId: string,
  trigger: CheckpointTrigger,
  projectId: string,
) {
  const projectSettings = await getProjectSettings(projectId);
  if (!projectSettings.autoCheckpointsEnabled) return;
  if (
    trigger === "SCOPE_CHANGE" &&
    !projectSettings.autoCheckpointOnScopeChange
  )
    return;
  if (
    trigger === "ESTIMATE_CHANGE" &&
    !projectSettings.autoCheckpointOnEstimateChange
  )
    return;

  // Check debounce: if a checkpoint with same taskId + trigger exists within debounce window, update it
  const recent = await findRecentCheckpoint(
    taskId,
    trigger,
    projectSettings.checkpointDebounceMinutes,
  );
  if (recent) {
    await updateCheckpointSnapshot(recent.id);
  } else {
    await createCheckpoint(taskId, trigger);
  }
}
```

When to trigger (call for BOTH the task and its parent):

| Service Method                          | Trigger           | Condition                                |
| --------------------------------------- | ----------------- | ---------------------------------------- |
| `task.createTask()` (with parentId)     | `SCOPE_CHANGE`    | Only if baseline exists for the parent   |
| `task.updateTask()` (estimate changed)  | `ESTIMATE_CHANGE` | Always (on the task + its parent)        |
| `task.updateTask()` (`completedAt` set) | `TASK_COMPLETED`  | Always                                   |
| `task.deleteTask()` (with parentId)     | `SCOPE_CHANGE`    | Only if baseline exists for the parent   |
| `timeEntry.startTimer()`                | `WORK_STARTED`    | Only if no baseline exists for this task |

### 7. Toggl Code is Isolated — Per-User Tokens Only

All Toggl Track API code lives in `lib/toggl/`. The main app must work without Toggl. Toggl fields on models (`togglTagId`, `togglTagName`, `togglApiToken`, `togglWorkspaceId`) are all optional.

**Never** import from `lib/toggl/` in services, actions, or components outside of the Toggl integration feature (iteration 6).

**No Toggl env vars**: Each user stores their own Toggl API token and workspace ID in their user settings (User model fields). The `lib/toggl/api.ts` reads from the database, never from `process.env`.

## Schema Reference

### Models (compact)

```
User {
  id: String @id @default(cuid())
  email: String @unique
  password: String
  togglApiToken: String?
  projects: Project[]
  timeEntries: TimeEntry[]
  createdTasks: Task[]
  tags: Tag[]
  appliedTaskTags: TaskTag[]
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
  parentId: String? → Task (self-ref "SubTasks")
  createdById: String → User
  title: String
  description: String?
  estimate: Int? (MINUTES)
  depth: Int?
  togglTagId: Int?
  togglTagName: String?
  createdAt: DateTime @default(now())
  updatedAt: DateTime @updatedAt
  completedAt: DateTime?          // set when completed, cleared on uncomplete
  archivedAt: DateTime?           // planned: set when archived, cleared on unarchive
  deletedAt: DateTime? (soft delete)
  taskTags: TaskTag[]
  timeEntries: TimeEntry[]
  todoItems: TodoItem[]
  convertedTodoItem: TodoItem? (one-to-one)
  taskEvents: TaskEvent[]
  checkpoints: Checkpoint[]
  checkpointTasks: CheckpointTask[]
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
  userId: String @unique → User
  taskId: String → Task
  startedAt: DateTime
  createdAt: DateTime @default(now())
}

TodoItem {
  id: Int @id @default(autoincrement())
  taskId: String → Task ("TaskTodos")
  title: String
  isCompleted: Boolean @default(false)
  estimate: Int? (MINUTES)
  convertedToTaskId: String? @unique → Task ("ConvertedTodoItem")
  createdAt: DateTime @default(now())
}

Tag {
  id: Int @id @default(autoincrement())
  name: String
  userId: String → User
  taskTags: TaskTag[]
  @@unique([name, userId])
}

TaskTag {
  id: String @id @default(cuid())
  taskId: String → Task
  tagId: Int → Tag
  userId: String → User (who applied this tag)
  createdAt: DateTime @default(now())
  @@unique([taskId, tagId])
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
  checkpointTasks: CheckpointTask[]
  addedTasks: CheckpointTask[] (relation: "AddedAtCheckpoint")
}

CheckpointTask {
  id: String @id @default(cuid())
  checkpointId: String → Checkpoint
  taskId: String → Task
  estimate: Int? (MINUTES)
  trackedSoFar: Int (SECONDS)
  existedAtBaseline: Boolean
  addedAtCheckpointId: String? → Checkpoint (relation: "AddedAtCheckpoint")
  createdAt: DateTime @default(now())
  @@unique([checkpointId, taskId])
}

enum TaskEventType { ESTIMATE_SET, ESTIMATE_CHANGED, SUBTASK_CREATED, SUBTASK_REMOVED,
                     TODO_ADDED, TODO_CONVERTED, TODO_COMPLETED, TASK_STARTED,
                     TASK_COMPLETED, TASK_STATUS_CHANGED, TAGS_CHANGED, CHECKPOINT_CREATED }
enum CheckpointTrigger { MANUAL, WORK_STARTED, SCOPE_CHANGE, ESTIMATE_CHANGE, TASK_COMPLETED }
```

### Relationship Map

```
User ──1:N──> Project ──1:N──> Task ──1:N──> TimeEntry
  │                              │
  ├──1:N──> TimeEntry            ├──self──> Task (children)
  ├──1:N──> Tag                  ├──1:N──> TaskTag ──N:1──> Tag
  ├──1:1──> ActiveTimer          ├──1:N──> TodoItem (with optional estimate)
  │                              ├──1:N──> TaskEvent
  │                              └──1:N──> Checkpoint ──1:N──> CheckpointTask ──N:1──> Task
  │
  └──1:N──> Project ──1:N──> Checkpoint
```

## Service Responsibilities

| Service              | Owns                                                                  | Calls                                 |
| -------------------- | --------------------------------------------------------------------- | ------------------------------------- |
| `project.service`    | Project CRUD                                                          | —                                     |
| `task.service`       | Task CRUD, hierarchy                                                  | `event.service`, `checkpoint.service` |
| `timeEntry.service`  | Start/stop timers (AD-16/17: ActiveTimer + mandatory stoppedAt), duration calc | `event.service`, `checkpoint.service` |
| `event.service`      | TaskEvent creation, queries                                           | —                                     |
| `checkpoint.service` | Checkpoint CRUD, debouncing, snapshots, comparisons                   | —                                     |
| `todo.service`       | TodoItem CRUD (including estimate), conversion to sub-task            | `task.service`, `event.service`       |
| `analysis.service`   | Error decomposition, accuracy metrics, trends                         | `checkpoint.service`                  |

## File Change Guide

### "I need to add a new field to Task"

1. `prisma/schema.prisma` — add field to Task model
2. Run `npx prisma migrate dev --name add-field-name`
3. `lib/services/task.service.ts` — add field to create/update functions
4. `lib/actions/task.actions.ts` — expose field in server actions
5. UI components that display/edit tasks

### "I need to add a new TaskEvent type"

1. `prisma/schema.prisma` — add to `TaskEventType` enum
2. Run migration
3. `lib/services/event.service.ts` — no change needed (generic emitEvent)
4. `lib/services/*.service.ts` — add `emitEvent()` call in the relevant mutation

### "I need to change checkpoint trigger logic"

1. `lib/services/checkpoint.service.ts` — modify `createCheckpoint()` or `debounceOrCreate()`
2. `lib/services/task.service.ts` or `timeEntry.service.ts` — modify the trigger call site

### "I need to add a new page"

1. Create `app/s/[route]/page.tsx` (Server Component)
2. Fetch data via service calls
3. Create client components in the same directory or `components/`
4. If mutations needed: add Server Actions in `lib/actions/`

### "I need to add a new API route"

Only needed for external integrations (Toggl, webhooks). Internal reads use Server Components; mutations use Server Actions.

1. Create `app/api/[route]/route.ts`
2. Validate input with Zod
3. Call service functions
4. Return NextResponse.json()

## Iteration Status

Update this table as iterations are completed.

| #   | Name                  | Status      | Key Files                                                    |
| --- | --------------------- | ----------- | ------------------------------------------------------------ |
| 0   | Schema + Foundation   | DONE        | prisma/schema.prisma, lib/services/\*, lib/toggl/\*          |
| 1   | Task Tracking MVP     | IN PROGRESS | task.service, project.service, app/s/project/[project-id]/\* |
| 2   | Event Log             | NOT STARTED | event.service, task.service, timeEntry.service               |
| 3   | Checkpoint System     | NOT STARTED | checkpoint.service, task.service, app/s/settings/\*          |
| 4   | TodoItem + Conversion | NOT STARTED | todo.service, components/todo-list.tsx                       |
| 5   | Analysis Dashboard    | NOT STARTED | analysis.service, app/s/[projectId]/analysis/\*              |
| 6   | Toggl Integration     | NOT STARTED | lib/toggl/\*, app/s/settings/\*                              |

## Critical Invariants

These must ALWAYS hold true. Verify after any change:

1. **Time entries only on tasks** — every TimeEntry must reference a valid Task
2. **One ActiveTimer per user** — enforced by `@@unique([userId])` on ActiveTimer (AD-17). ActiveTimer = running, TimeEntry = completed.
3. **Task depth is accurate** — `task.depth` must equal the number of ancestors (0 for root)
4. **Checkpoints never cascade above parent** — auto-checkpoint triggers ONLY fire for the changed task and its direct parent
5. **Events are append-only** — never update or delete TaskEvent rows
6. **Checkpoint baselines are unique per task** — a task can have at most ONE checkpoint with `isBaseline = true`
7. **CheckpointTask pairs are unique** — `[checkpointId, taskId]` is enforced as unique
8. **Toggl is optional** — the app must function fully without any Toggl configuration
9. **No Toggl env vars** — Toggl API tokens are per-user (stored in User model), never in `.env` or `process.env`
