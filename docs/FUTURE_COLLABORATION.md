# Future: Collaboration & Team Features

Anchor document for expanding the current single-user architecture into a collaborative platform. The schema foundations (AD-12 through AD-15) were designed to make this transition non-breaking.

---

## Core premise

The app is NOT just a time tracker — it combines time tracking with estimation analysis and hierarchical task management. Collaboration is a natural evolution where:

- **(a)** Teams track worked time together on shared projects
- **(b)** Individuals AND teams analyze planning accuracy and time estimate quality

One app for tracking, planning, and analyzing — no need for separate tools.

---

## What exists today (foundation)

| Schema element              | Purpose                           | Future role                                             |
| --------------------------- | --------------------------------- | ------------------------------------------------------- |
| `Task.createdById`          | Immutable task creator            | Identifies the planner/distributor in team context      |
| `Task.projectId` (required) | Every task belongs to one project | Authorization anchor — project membership = task access |
| `Tag.userId`                | Per-user tag vocabulary           | Each team member tags tasks with THEIR tags             |
| `TaskTag.userId`            | Who applied this tag to this task | Enables dual-perspective analysis (planner vs executor) |
| `TimeEntry.userId`          | Who tracked this time             | Already multi-user ready — no changes needed            |

---

## Phase 1: Project membership

### Prerequisite: Scoped Repository Pattern

Before implementing multi-user project membership, introduce a scoped repository layer that automatically enforces data isolation by user/project context. Currently, services manually add `userId` or `projectId` to every query — a pattern that works for single-user MVP but doesn't scale safely.

**What it is**: A thin wrapper around Prisma that receives the current user/project context at construction and automatically scopes all queries. Instead of `prisma.task.findMany({ where: { projectId, ... } })`, you'd use `scopedRepo.tasks.findMany({ where: { ... } })` where the project scoping is implicit.

**Why before Phase 1**:
- Multi-user projects multiply the surface area for data isolation bugs
- Forgetting a `userId` or `projectId` filter becomes a cross-tenant data leak, not just a personal inconvenience
- The pattern also simplifies service code by eliminating repetitive context-passing

**Implementation approach** (decide at implementation time):
- Option A: Prisma Client Extensions with scoped context
- Option B: Repository classes instantiated per-request with context baked in
- Option C: Prisma middleware that injects scoping filters

This is explicitly deferred past MVP — the current manual scoping is correct and sufficient for single-user use.

### New model: `ProjectMember`

```prisma
model ProjectMember {
  id        String            @id @default(cuid())
  projectId String
  project   Project           @relation(fields: [projectId], references: [id])
  userId    String
  user      User              @relation(fields: [userId], references: [id])
  role      ProjectMemberRole
  joinedAt  DateTime          @default(now())

  @@unique([projectId, userId])
}

enum ProjectMemberRole {
  OWNER
  MEMBER
  VIEWER
}
```

### Migration path

1. Create `ProjectMember` table
2. For every existing `Project`, insert one `ProjectMember` row: `(projectId, project.userId, OWNER)`
3. Authorization check changes: `project.userId === me` → `ProjectMember.exists(projectId, userId)`
4. `Project.userId` is kept as a convenience field (original creator), but no longer used for auth

### What stays untouched

- `Task.createdById` — still valid, still immutable
- `Tag` / `TaskTag` — already user-scoped, no changes
- `TimeEntry.userId` — already multi-user

---

## Phase 2: Task assignment

### New field: `Task.assigneeId`

```prisma
model Task {
  // existing fields...
  assigneeId String?
  assignee   User? @relation("AssignedTasks", fields: [assigneeId], references: [id])
}
```

### Semantics

- `createdById` = who planned/created the task (immutable)
- `assigneeId` = who is responsible for executing it (mutable)
- In solo mode: both are the same user (assigneeId can be auto-populated)
- In team mode: owner creates and assigns to a team member

### Constraint

`assigneeId` must reference a user who is a `ProjectMember` of the task's project.

---

## Phase 3: Dual-perspective tag analysis

This is the core differentiator. With the existing schema, analysis queries look like:

```sql
-- Planner's perspective: "How accurate were MY estimates for tasks I tagged 'backend'?"
SELECT t.estimate, SUM(te.duration) as tracked
FROM Task t
JOIN TaskTag tt ON tt.taskId = t.id
JOIN Tag tag ON tag.id = tt.tagId
JOIN TimeEntry te ON te.taskId = t.id
WHERE tt.userId = :plannerId  -- tags applied by the planner
  AND tag.name = 'backend'
GROUP BY t.id;

-- Executor's perspective: "How long did tasks I tagged 'complex' actually take me?"
SELECT t.estimate, SUM(te.duration) as tracked
FROM Task t
JOIN TaskTag tt ON tt.taskId = t.id
JOIN Tag tag ON tag.id = tt.tagId
JOIN TimeEntry te ON te.taskId = t.id
WHERE tt.userId = :executorId  -- tags applied by the executor
  AND te.userId = :executorId  -- only THEIR time
  AND tag.name = 'complex'
GROUP BY t.id;
```

No schema changes needed — `TaskTag.userId` already enables this.

---

## Phase 4: Sharing & access control

### Options (decide at implementation time)

**Option A: Role-based on ProjectMember**

- `OWNER` = full access
- `MEMBER` = create/edit/track tasks, apply own tags
- `VIEWER` = read-only

**Option B: Task-level permissions**

- Fine-grained per-task visibility (e.g., mark a task as private within a shared project)
- More complex, defer unless explicitly needed

### Recommendation

Start with Option A (role-based). Option B is additive on top if ever needed.

---

## Not planned / out of scope

- **Cross-project task sharing** — tasks live in exactly one project
- **Tag taxonomies / hierarchical tags** — tags are flat strings per user
- **Real-time collaboration** — server-side rendering + polling is sufficient initially
- **Billing / invoicing** — time tracking is for analysis, not billing

---

## Decision log

| Decision                                     | Rationale                                                         | Reversible?                                               |
| -------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------- |
| Project-level collaboration (not task-level) | Simpler auth model, covers 90% of use cases                       | Could add task-level sharing later (additive)             |
| Creator = immutable owner                    | Single `createdById` field, no ownership transfer complexity      | Could add `assigneeId` separately (Phase 2)               |
| Per-user tags (not per-project)              | Cross-project analysis; "backend" means the same thing everywhere | Could add project-scoped tags later as a separate concept |
| `TaskTag.userId` added now                   | Prevents data loss — can't retroactively know who tagged what     | N/A — forward-only                                        |
