---
name: plan
description: "Trigger when the user asks to plan work, decompose a feature, break down a task, or start an iteration. Produces a dependency-ordered step list."
---

# Plan Skill (FAST Mode)

## Behavior

1. Read `PROJECT_CONTEXT.md` (architecture, key files, boundaries). Deliberate with Sequential Thinking.
2. Produce a numbered, dependency-ordered step list. Each step:
   - **What** — concrete change
   - **Where** — file(s) affected
   - **Why** — rationale citing project patterns or decisions
   - **Depends on** — prior steps required
3. Present for approval. Do not implement until approved.
