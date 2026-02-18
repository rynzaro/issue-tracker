# Architecture Foundation

Root decisions. Why the app is shaped this way.

---

### AF-1: Purpose — Estimation Accuracy Decomposition

App answers: "Why are my time estimates wrong?" Decomposes error into:

- **Scope error**: time on tasks you didn't plan for
- **Effort error**: overrun on tasks you did plan for

Drives everything. Tasks need estimates. Time tracking mandatory. Checkpoints capture plan snapshots. Analysis compares baseline to outcome. Without this, it's just another task tracker.

### AF-2: Tech Stack

Next.js 16 App Router, React 19, Prisma 7, MariaDB (Docker), NextAuth 5, Tailwind 4, HeadlessUI, Zod, pnpm, TypeScript 5.

Server components → direct DB reads. Server actions → replace REST for mutations. MariaDB → available/preferred. Credentials-only auth → no OAuth providers needed for a personal tool.

### AF-3: Three-Layer Code Flow

```
Component → Server Action → Service → Prisma
```

- **Services** (`lib/services/`): all business logic. Pure functions. No auth checks.
- **Server Actions** (`lib/actions/`): thin wrappers. Auth → validate → service → revalidatePath → return.
- **Server Components**: call services directly for reads. No API routes.

No business logic in components, actions, or API routes. API routes only for external integrations (Toggl). Services stay testable.

### AF-4: Hierarchical Task Model

Self-referential via `parentId`. Unlimited nesting. `depth` = ancestor count (0 = root). Time rolls up children → parents.

No position field. Ordering client-side. Re-add later if persistent drag-and-drop needed.

Every task → one project → one user. Single-user ownership, no sharing/collaboration model.

### AF-5: Tags over Category

M:N relation (Tag model + implicit join). Replaces `category: String?`. Task can span multiple concerns ("frontend" + "auth"). Tags scoped to project.

Event: `TAGS_CHANGED`, payload: `{ added: string[], removed: string[] }`.

### AF-6: Bidirectional Status Transitions

Four statuses: `PLANNING`, `ACTIVE`, `COMPLETED`, `ARCHIVED`. Any → any. No enforced linear flow.

`completedAt` set on transition TO COMPLETED, cleared on transition FROM. Service code handles, not DB triggers. Real workflows aren't linear.

### AF-7: Single Active Timer

One timer per user. Starting new auto-stops previous. TimeEntry: start/stop/duration (seconds, computed on stop).

No overlapping entries. Clean time attribution.

### AF-8: Event Log — Append-Only Audit Trail

Every mutation emits TaskEvent. Generic `emitEvent(taskId, type, payload)`. Never updated or deleted. Payload validated with Zod.

12 event types: ESTIMATE_SET, ESTIMATE_CHANGED, SUBTASK_CREATED, SUBTASK_REMOVED, TODO_ADDED, TODO_CONVERTED, TODO_COMPLETED, TASK_STARTED, TASK_COMPLETED, TASK_STATUS_CHANGED, TAGS_CHANGED, CHECKPOINT_CREATED.

Full history of what changed, when. Feeds checkpoint logic + user-facing timeline.

### AF-9: Checkpoint System — Baseline + Snapshots

Checkpoint = snapshot of task + direct children (estimate, tracked time, status per child).

First WORK_STARTED checkpoint = baseline (`isBaseline = true`). Analysis compares baseline → completion.

Rules:

- Baseline scoped per-task, not per-hierarchy
- Fire for changed task + direct parent, NEVER grandparent+
- Five triggers: MANUAL, WORK_STARTED, SCOPE_CHANGE, ESTIMATE_CHANGE, TASK_COMPLETED
- Debounce (default 30 min) groups rapid changes. Destructive — intermediate state lost.
- `existedAtBaseline` on CheckpointTask enables scope/effort decomposition

### AF-10: ProjectSettings over User Settings

Checkpoint config on ProjectSettings (1:1 with Project), not User. Different projects need different checkpoint granularity.

Fields: `autoCheckpointsEnabled`, `autoCheckpointOnScopeChange`, `autoCheckpointOnEstimateChange`, `checkpointDebounceMinutes`.

### AF-11: TodoItems — Lightweight Pre-Tasks

Simple checklists on tasks. Fields: title, isCompleted, optional estimate. No time tracking, no hierarchy.

Convert todo → sub-task when ready. Creates Task with todo's title + estimate. `convertedToTaskId` on TodoItem tracks lineage (no `isFromTodo` flag on Task — redundant). Conversion triggers SCOPE_CHANGE checkpoint if baseline exists.

### AF-12: Soft Delete + No DB Cascades

`deletedAt` on Task. Queries filter `IS NOT NULL` out. No cascade to children — they orphan. No restore.

All FKs `onDelete: Restrict`. Service code handles deletion dependencies explicitly. DB never silently removes related data.

### AF-13: Toggl is Isolated + Optional

All Toggl code in `lib/toggl/`. Main app works fully without. No imports from `lib/toggl/` outside the feature.

Per-user tokens in User model (`togglApiToken`). No env vars. Optional fields on Task: `togglTagId`, `togglTagName`.

Toggl = convenience, not dependency.

### AF-14: Auth — Single User, Credentials Only

NextAuth 5, credentials provider, bcrypt. No OAuth, no magic links. Auth middleware via `proxy.ts`. Protected routes under `/s/`, public under `/public/`.

Session checked in every server action. No multi-tenancy — each user sees only their own projects. Personal productivity tool, not team collaboration.
