# Task.createdById — direct ownership

`Task.createdById` is a required FK to `User`. Records who created the task, immutable. In solo mode, always the project owner. In future multi-user mode, records the planner/distributor independently of assignees.
