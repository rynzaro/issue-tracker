# Explicit TaskTag junction table with user attribution

Replaced implicit `Tag[] ↔ Task[]` many-to-many with explicit `TaskTag` model. Each row records `taskId`, `tagId`, and `userId` (who applied the tag). In solo mode, userId is always the current user. In future team mode, this enables dual-perspective analysis: planner tags for planning shortcomings, executor tags for execution analysis — both on the same task.
