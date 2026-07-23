# D-11 — Only the project owner may add or remove Task Members

**Status:** RESOLVED 2026-07-23

## Context

Task Membership introduces a second actor, but control over who can join a
task must stay strictly with the project owner.

## Decision

Only the **project owner** may add or remove Task Members. No other principal —
not the host-task creator if they differ from the owner, not a Task Member, not
a future role — may perform either action. This is firm and unchangeable without
reopening this decision.

## Rules

- The `addTaskMember` and `removeTaskMember` acts require `project:update` or a
dedicated `task:manage-members` act that is itself granted **only** by
`project.userId`.
- A Task Member cannot invite another user, even to help on their own created
subtree. If a member needs help, the owner must add that user as a member of
the host task (or the relevant subtask).
- Removal cascades per D-09.

## Consequences

- `TaskMember` row creation/deletion is a project-owner-only operation.
- The authorization policy does not need a "member can invite" cell.
- UI for add/remove member is visible only to the owner.
