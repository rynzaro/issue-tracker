# Task status via datetime flags, no enum

Status is derived from nullable datetime fields (`completedAt`, `archivedAt`, `deletedAt`) rather than a `TaskStatus` enum. Avoids enum migration overhead, allows null-check queries directly, and keeps each state transition explicit. `archivedAt` to be added in Iteration 1.
