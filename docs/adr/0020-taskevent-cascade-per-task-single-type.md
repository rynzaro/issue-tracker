# Cascading transitions emit one TaskEvent per affected task, same type, cascade origin in payload

Hierarchy transitions (complete/uncomplete/archive/unarchive/delete/restore, ADR-0018) change many tasks in one authorized act. Each affected task gets its own event so every task's timeline reads complete on its own — a child completed via its parent must not have a silent state change. Cascaded events use the **same event type** as the direct act, with `causedBy: <targetTaskId>` in the payload; direct acts omit `causedBy`.

## Considered Options

Rejected `TASK_COMPLETED_CASCADE`-style twin types: every cascading transition would need a twin (~6 extra types), and every consumer asking "when was this completed?" would have to match two types forever. The type is the verb ("what happened"); the payload carries the circumstances ("how it came about"). Cascade-vs-direct is one bit, already expressible as presence of `causedBy`.
