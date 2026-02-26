---
name: implement
description: "Trigger when the user asks to implement a feature, write code, fix a bug, or build something. Spec-gate, deliberate, implement with rationale."
---

# Implement Skill (FAST Mode)

## Behavior

### Spec Gate
Before writing code, verify the task has: (1) which file(s) change, (2) expected behavior, (3) at least one edge case. If any are missing, ask for clarification. Do NOT proceed without all three.

### Implement
1. Read `docs/AGENT.md`. Check iteration status. Read relevant existing files to match patterns.
2. Use Sequential Thinking to identify the approach. If multiple viable approaches surface during thinking, present the top 2 with concrete tradeoffs and let the user choose.
3. Write the code following existing patterns.
4. After implementation, briefly note non-obvious decisions: why this approach, edge cases handled, anything relevant for future changes.
