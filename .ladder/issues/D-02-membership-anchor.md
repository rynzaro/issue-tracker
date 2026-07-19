# D-02 — Membership anchor: task-level, project-level, or both?

**Status:** RESOLVED 2026-07-19 — Option A

## Context

Two documents disagree on where membership lives, and this decision dissolves
the conflict before any schema work.

- **FUTURE_COLLABORATION.md Phase 1** models `ProjectMember` (project-level
  membership: `@@unique([projectId, userId])`, roles OWNER/MEMBER/VIEWER) and says
  "project membership = task access." Phase 2 then adds `Task.assigneeId`.
- **AUTHORIZATION_PLAN.md §7** states Felix's vision (2026-07-11): "people can
  be **added to a task** (task membership). Task members cannot edit the task;
  they create sub-tasks under it, which they then execute." No `assigneeId`, no
  project-wide membership.
- **CONTEXT.md** glossary: *Task Member (future)* = "A user added to a specific
  task. May create sub-tasks under it (which they then execute); may not edit or
  execute the task itself."

These are two different products. FUTURE_COLLABORATION's own §34 flags the
conflict: its table row ("project membership = task access") and Phase 2
`assigneeId` both predate and conflict with the AUTHORIZATION_PLAN decision.
ADR-0019 §1 explicitly says "#19 (assigneeId mismatch) should be resolved
together with this." So this ticket is also the resolution home for the
`assigneeId` concept (kill it, per D-04).

Schema today has neither `ProjectMember` nor any `TaskMember`/`assigneeId`.

## Decision

Where does membership attach for the Task Member feature? Task-level
(`TaskMember` table), project-level (`ProjectMember`, FUTURE_COLLABORATION
Phase 1), or both?

## Options

- **A. Task-level membership only (`TaskMember`).** A row per
  `(taskId, userId)` grants the CONTEXT.md Task Member rights on that one task:
  add children, execute the children you create. Matches the glossary and
  AUTHORIZATION_PLAN §7 verbatim. A member of a leaf task can branch a subtree
  from it; nothing in the rest of the project is visible to them. Smallest
  schema footprint; tightest authority surface; directly serves the
  estimation-evidence principle (a member's evidence stays in their subtree).
- **B. Project-level membership only (`ProjectMember`).** FUTURE_COLLABORATION
  Phase 1. Membership = project access; roles gate acts project-wide. Task
  Member as glossary-defined does not exist — instead a project MEMBER can
  create tasks anywhere. Broader; collides with creator-exclusive execution
  (a MEMBER could create a task they then execute, which is fine, but
  "added to a specific task" semantics are lost — every member sees everything).
  Also drags in the Phase-2 `assigneeId` conflict directly.
- **C. Both, sequenced.** Land `TaskMember` first (the actual feature); add
  `ProjectMember` later if project-wide collaboration is ever wanted. Project
  membership would then *grant* the right to be added as a Task Member, not
  replace it. Keeps the narrow thing first, leaves the broad thing additive —
  consistent with FUTURE_COLLABORATION's own "Could add task-level sharing
  later (additive)" decision-log row, just in the opposite order.

## Blocking edges

- **Blocks:** D-03 (visibility — what a member can see is defined by where
  membership attaches), D-07 (the member's structural authority on the host
  only makes sense once "member of what" is fixed), D-05 (checkpoint scope
  follows the membership boundary).
- **Blocked by:** none directly (independent of D-01 in concept; but if D-01 =
  foundation-first, this decision still chooses the schema shape the policy
  module must express).

## Resolution (2026-07-19)

**Option A — task-level only, no project-level membership ever.** A
`TaskMember` row per `(taskId, userId)` grants the CONTEXT.md Task Member
rights on that one task. `ProjectMember` is **not** modeled now and **not** a
planned later addition — no project-level membership, full stop. This closes
the FUTURE_COLLABORATION vs AUTHORIZATION_PLAN conflict firmly on the
AUTHORIZATION_PLAN / glossary side: the "added to a specific task" model is
the only membership concept.

`#19` (assigneeId mismatch) resolves here too — see D-04: no assigneeId.
FUTURE_COLLABORATION Phase 1 (`ProjectMember`) and Phase 2 (`assigneeId`) are
both superseded by this decision and should be marked as such in that doc
when multiplayer work begins.