# Single active task, frontend-derived parent indicators, recursive time rollup

Starting work on a task creates ONE TimeEntry for that task only. Only one task can be active per user at a time — starting a new task auto-stops the previous one. Parent tasks never get their own TimeEntry from child work; instead, the frontend derives a "has active descendant" indicator by walking the task tree during tree building. Total tracked time for any task = own TimeEntries + recursive sum of children's TimeEntries (computed on-the-fly, not denormalized). Status is derived at read time: has ActiveTimer → IN_PROGRESS, `completedAt ≠ null` → DONE, else → OPEN (see ADR-0016 for ActiveTimer enforcement). Complements ADR-0007 (status via datetime flags).

**Considered options:** Creating TimeEntries for ancestor tasks ("ancestor chain") — rejected: too many redundant DB rows, time rollup should be computed not duplicated.
