---
name: plan
description: "Trigger when the user asks to plan work, decompose a feature, break down a task, or start an iteration. Produces a dependency-ordered step list."
---

# Plan Skill (FAST Mode)

## Behavior

1. Read `docs/AGENT.md` (iteration status, rules) and `docs/ROADMAP.md` (done/pending). Deliberate with Sequential Thinking.
2. Produce a numbered, dependency-ordered step list. Each step:
   - **What** — concrete change
   - **Where** — file(s) affected (reference AGENT.md File Change Guide patterns)
   - **Why** — rationale citing specific ADs or architecture rules
   - **Depends on** — prior steps required
3. Present for approval. Do not implement until approved.
