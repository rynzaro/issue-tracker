---
status: accepted 2026-07-23
---

# Task Membership: task-level collaboration

**Grilled 2026-07-23 (`/grill-with-docs`).** Adds a second actor to a project:
a user added to a specific task (the **host**), who may create sub-tasks under
it and execute those they create. Supersedes `docs/FUTURE_COLLABORATION.md`
Phases 1 and 2 for the Task Member feature.

## Membership anchor: task-level only

A `TaskMember` row per `(taskId, userId)`. No `ProjectMember`, no project-level
membership, no `assigneeId`. This closes the conflict between
`docs/FUTURE_COLLABORATION.md` (which proposed `ProjectMember` and
`Task.assigneeId`) and `docs/AUTHORIZATION_PLAN.md` §7 / `CONTEXT.md` glossary.

## Authority

Three authority roots (ADR-0019 addendum) remain, now extended with the
membership grant:

| Root | Field | Acts |
|---|---|---|
| Structural | `project.userId` | Project owner: project ops, full task tree shape, complete/archive/delete/restore, read everything |
| Structural (membership) | `TaskMember` junction | Task Member: `task:create-child` on the host only |
| Execution | `task.createdById` | Task creator: run timer, manual time entry on that task. Exclusive even against the project owner |
| Entry author | `entry.userId` | Amend/delete own time entry |

A Task Member holds **only** `task:create-child` on the host. They may not
edit, complete, archive, delete, or execute the host. On any task they create,
they hold the creator's full structural and execution authority, including adding
further sub-tasks under it.

## Visibility

A Task Member sees **only the host task and its descendants**. No ancestors,
no siblings, no other project tasks. This is the data-isolation boundary for
membership; structural/visibility is the one place "project membership = task
access" from FUTURE_COLLABORATION survives, narrowed to the host subtree.

## Checkpoint authorship is per-principal

`Checkpoint` rows gain `createdById`. Each principal has their own plan/baseline/
reality stream:

- A member's `SCOPE_CHANGE` under the host writes the **member's** plan
  checkpoint on the host. The new child appears in the owner's parent
  cross-section as a fact, not the owner's belief.
- A member's `WORK_STARTED` on their own subtask is the member's baseline and
  does **not** close the owner's plan window.
- A member's `TASK_COMPLETED` on their own subtask fires a reality checkpoint on
  the host, authored by the member.

## Transitions are authorized over the write-set

A hierarchy transition is permitted iff the principal may transition every node
in the plan returned by `buildTransitionPlan`. `applyTransition` checks the
target, builds the plan, loops `assertCan` over the plan ids, then executes.
Bounded cascades are forbidden. A member may complete their own subtree but may
not uncomplete if the upward repair would reopen a task they cannot modify.
Denials surface with a legible error variant, not `UNEXPECTED_ERROR`.

## Estimation analysis is per-principal

The future analysis dashboard (#26) grades each person against their own
checkpoints and their own time entries. The Phase-3 dual-perspective tag view
(FUTURE_COLLABORATION) remains a separate, later lens and does not override
per-principal grading.

## Member removal

Removing a member soft-deletes the member's entire created subtree under the
host and the member's time entries on those tasks. No copies remain in the
owner's tree or analysis. The `TaskMember` row itself is deleted. Checkpoints
authored by the member stay in the DB but no longer surface in the owner's
analysis because their tasks/time entries are deleted.

## Member management is owner-only

Only the **project owner** may add or remove Task Members. The `addTaskMember`
and `removeTaskMember` acts are granted solely by `project.userId`. No member,
host-task creator, or future role may invite or remove members.

## Notifications and activity feed

- Email the added user when they become a Task Member.
- Owner sees a project activity feed drawn from `TaskEvent` rows for member
  actions.

## Consequences

- `TaskMember` table added to schema.
- `Checkpoint` table gains `createdById`.
- `docs/FUTURE_COLLABORATION.md` Phases 1 (`ProjectMember`) and 2 (`assigneeId`)
  are superseded for Task Member work. Phase 3 (dual-perspective tag analysis)
  remains a later, separate lens.
- ADR-0012's "planner/distributor independently of assignees" wording is wrong
  (no assignee concept); update it when editing that ADR.
