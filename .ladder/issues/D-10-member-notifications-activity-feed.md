# D-10 — Member notifications and owner activity feed

**Status:** RESOLVED 2026-07-23

## Context

Task Membership adds a second actor to a project. The owner needs visibility
into what members did; the member needs to know they were added.

## Decision

1. **Email on add.** When a project owner adds a user as a Task Member, send an
   email to that user.
2. **Owner activity feed.** Provide an activity feed for the owner showing what
   members did on tasks in the project.

## Rules

- Email content: that they were added to a specific task, by whom, and a link to
  the task. The email service is the project's existing email mechanism (TBD at
  implementation time if not present).
- Activity feed source: `TaskEvent` rows already record the acting user
  (`TaskEvent.userId`). The feed reads events for tasks in the project.
- Feed contents: member actions such as task created, completed, time entries
  added, estimates changed.
- The feed is owner-facing; members see only their own subtree (D-03-A) and have
  no project-wide feed.
- The feed is read-only; it does not add new event types. If needed event types
  are missing, add them as a separate task, not in this feature.

## Consequences

- `TaskEvent` remains the audit source of truth (CONTEXT.md).
- No new notification table is required for the MVP; email can be sent
  synchronously from the add-member action or queued later.
