# D-09 — Member removal: cascading soft-delete of member's subtree and time entries

**Status:** RESOLVED 2026-07-23

## Context

Task Members (D-02-A) create sub-tasks under a host and execute them (D-04-A,
D-07-A). When the owner removes a member, the member's work must not remain as
orphaned clutter in the project tree, and the member's estimation evidence must
not continue to feed the owner's analysis.

## Decision

On removal of a Task Member from a host task, soft-delete the member's **entire
created subtree** under that host and the member's **time entries** on those
tasks. No copies, no read-only archives, no analysis traces remain in the
project owner's view.

## Rules

- Soft-delete only (DB rows kept, `deletedAt` set), consistent with
  ADR-0009/0010. No hard deletes.
- Cascade target: every `Task` in the subtree whose root `createdById` equals the
  removed member and whose ancestor chain leads to the host.
- Delete the member's `TimeEntry` rows on those tasks.
- Delete the member's `ActiveTimer` if one is running on a task in the subtree.
- Delete the `TaskMember` row itself last.
- A member's checkpoints remain in the DB (they are the member's own record,
  D-05-A), but because their child tasks and time entries are deleted, those
  checkpoints no longer surface in the owner's analysis or tree.
- Re-adding the same user later is a fresh membership with no recovered subtree.

## Consequences

- Removal is destructive to the project's plan state; the owner must confirm.
- Analysis (#26) loses the member's data entirely — this is the intent.
- Time entries are personal estimation evidence; they leave with the member.
