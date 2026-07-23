# Cascading transitions emit one TaskEvent per affected task, same type, cascade origin in payload

Hierarchy transitions (complete/uncomplete/archive/unarchive/delete/restore, ADR-0018) change many tasks in one authorized act. Each affected task gets its own event so every task's timeline reads complete on its own — a child completed via its parent must not have a silent state change. Cascaded events use the **same event type** as the direct act; direct acts omit `causedBy`.

`causedBy` in the payload names **the task that caused the change**:

- cascade and repair events — the task the user acted on;
- inherited states (#63) — the ancestor the state came from. A task restored under an archived ancestor comes back archived; it gets its restore event **and** an `ARCHIVED` event with `causedBy: <ancestor>`, because becoming archived is a state change of its own and the timeline must explain it. The event type is the forward act that sets the state; the stored date stays the ancestor's, while the event carries the time it happened.

## Considered Options

Rejected `TASK_COMPLETED_CASCADE`-style twin types: every cascading transition would need a twin (~6 extra types), and every consumer asking "when was this completed?" would have to match two types forever. The type is the verb ("what happened"); the payload carries the circumstances ("how it came about"). Cascade-vs-direct is one bit, already expressible as presence of `causedBy`.
