# D-04 — Execution authority under Task Membership: confirm creator-exclusive, reject assigneeId

**Status:** RESOLVED 2026-07-19 — Option A

## Context

ADR-0019 addendum settles execution authority as **creator-exclusive** —
`task.createdById` is the execution root, exclusive even against the project
owner, because time entries are personal estimation evidence ("a person judges
only their own ability to estimate, so nobody executes another's task").

CONTEXT.md glossary encodes this for the Task Member: "may create sub-tasks
under it (which they then execute); may not edit or execute the task itself."
So a Task Member branches a subtree and executes *their own created subtasks*;
they never execute the host.

But two things make this a live decision rather than a rubber stamp:

1. **The `assigneeId` conflict.** FUTURE_COLLABORATION Phase 2 proposes
   `Task.assigneeId` = "who is responsible for executing it," mutable, owner
   assigns to a member. AUTHORIZATION_PLAN §7 and ADR-0019 §1 call this
   **incompatible** with creator-exclusive execution and with the task-membership
   vision. One vision must win. This ticket is where #19 (assigneeId mismatch)
   is resolved, bundled with the membership work per ADR-0019.
2. **The wrong TODO comment.** `activeTask.service.ts:49` reads
   `// TODO: Replace with project membership/role check` — AUTHORIZATION_PLAN §1
   says this comment is wrong and must be **replaced, not honored**: `createdById`
   is the execution root *by design*, not a stopgap. Resolving this ticket sets
   the fate of that comment.

The estimation-evidence crux: if a member could execute the host task, the
host owner's estimate-accuracy analysis would be graded against someone else's
time. Creator-exclusive execution is what keeps each person's evidence
theirs. Task Membership preserves this *by routing members to their own
created subtrees*, never the host.

## Decision

For Task Membership, confirm that execution authority stays **creator-exclusive**:
a Task Member executes only the subtasks they created; they may not execute the
host task even though they are "added to" it. And resolve the `assigneeId`
conflict: adopt or reject the Phase-2 `assigneeId` concept.

## Options

- **A. Confirm creator-exclusive; reject `assigneeId`.** Execution = the
  creator of the task being executed, period. A Task Member's path to
  execution is to *create* a subtask (they become its creator) and run it.
  No `assigneeId` field; FUTURE_COLLABORATION Phase 2 is reversed. Matches
  ADR-0019 addendum, AUTHORIZATION_PLAN §7, and CONTEXT.md glossary. The
  `activeTask.service.ts:49` TODO is deleted (not honored) during the policy
  migration (D-01). #19 resolves to "no assignee concept."
- **B. Add `assigneeId` alongside creator-exclusive.** Keep `createdById` as
  the execution root but add a mutable `assigneeId` for "responsibility."
  Reject: two execution-shaped fields on one task is exactly the two-homes
  problem the rest of the ADRs fight (ADR-0021 "a fact with two homes has no
  rule for which wins"). `assigneeId` would either be inert (dead field) or
  contradict creator-exclusive execution.
- **C. Defer the assigneeId question.** Confirm creator-exclusive for Task
  Membership now; leave `assigneeId` as an explicitly-open later decision.
  Tempting but weak — ADR-0019 §1 says #19 should be resolved *together* with
  this work, and an open `assigneeId` keeps FUTURE_COLLABORATION Phase 2 alive
  as a standing contradiction.

## Blocking edges

- **Blocks:** D-05 (who authors reality checkpoints on a member's subtree
  depends on who may execute/complete it), D-06 (write-set authorization —
  who may complete/uncomplete which nodes), D-08 (whose estimates the
  analysis grades).
- **Blocked by:** none — upstream. (Interacts with D-02: task-level
  membership is what makes "member creates & executes own subtasks" coherent;
  project-level membership would weaken this, but the principle holds
  regardless.)

## Resolution (2026-07-19)

**Option A.** Execution authority is **creator-exclusive**, settled. A Task
Member executes only the subtasks they create; the owner never overrides
another creator's execution authority (and cannot execute a member's subtask).
No `assigneeId` field — the concept is rejected. FUTURE_COLLABORATION Phase 2
is reversed; `#19` resolves to "no assignee concept."

Consequences for the build:
- `createdById` is the execution root **by design**, not a stopgap. The
  `activeTask.service.ts:49` `// TODO: Replace with project membership/role
  check` is **deleted, not honored**, during the D-01 policy migration
  (AUTHORIZATION_PLAN §5 step 5).
- A Task Member's only path to executing work is to create a subtask under the
  host (D-07) and run its timer.
- ADR-0012's "planner/distributor independently of assignees" wording needs
  softening (AUTHORIZATION_PLAN §1) — no assignee concept exists.

The estimation-evidence invariant holds: a member's time lands only on tasks
they created, so each person's estimate-accuracy analysis (D-08) grades their
own estimates against their own time.