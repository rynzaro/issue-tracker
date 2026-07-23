# ActiveTimer table; mandatory stoppedAt on TimeEntry

**Context:** Enforce one active timer per user (ADR-0015).

**Decision:** Separate `ActiveTimer` table (`@@unique([userId])`). `TimeEntry.stoppedAt` and `duration` become NOT NULL.

**Rationale:**

- `@@unique([userId])` makes the invariant structurally impossible to violate — no app-level assertions needed.
- No dual source of truth (vs. pointer approach): ActiveTimer = running, TimeEntry = completed. Complementary, not redundant.
- Forward-compatible with all future delegation models.

**Schema addition:**

```prisma
model ActiveTimer {
  id        String   @id @default(cuid())
  userId    String   @unique
  taskId    String
  startedAt DateTime
  user      User     @relation(fields: [userId], references: [id])
  task      Task     @relation(fields: [taskId], references: [id])
}
```

TimeEntry changes: `stoppedAt DateTime` (NOT NULL), `duration Int` (NOT NULL).

**Consequences:** `startWork` and `stopWork` operate inside a transaction (delete ActiveTimer → insert TimeEntry, or vice versa). Time rollup = `SUM(TimeEntry.duration)` for completed work + `NOW() - ActiveTimer.startedAt` if one exists for the task.
