# Task.createdById — direct ownership

`Task.createdById` is a required FK to `User`. Records who created the task, immutable. In solo mode, always the project owner. In multi-user mode, records the task's creator and is the **execution-authority root** (ADR-0019 addendum): only the creator may run a task's timer or log time on it. No assignee concept exists (ADR-0023); the creator is the executor.
