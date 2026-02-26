# Copilot Instructions

Global defaults for every Copilot interaction in this workspace.
Active regardless of skill mode (LEARN or FAST).

---

## Project Context

Read `PROJECT_CONTEXT.md` before making any code change. It contains:

- Architecture patterns and code flow for this project
- Key files and entry points
- Coding conventions and style rules
- Boundaries (what the AI must never do)

If `PROJECT_CONTEXT.md` does not exist, run `@onboarding` to generate it.

---

## Deliberate Before Acting

Before non-trivial reasoning, pause and think step-by-step (use Sequential Thinking MCP if available, otherwise structure your reasoning explicitly):

- Planning a multi-step task
- Evaluating tradeoffs between approaches
- Debugging a non-obvious issue
- Reviewing code for correctness

Do NOT skip this for speed. The thinking step catches errors that cost more time downstream.

---

## Clarify Ambiguity

If the request could be implemented in multiple meaningfully different ways:

1. Identify the specific ambiguity
2. Ask 2–4 targeted questions (specific, answerable — not open-ended)
3. Wait for answers before proceeding

Do NOT guess when the implementation path is unclear.
Do NOT ask permission when the path is clear.

---

## Three-Tier Boundaries

### Always Do

- Read `PROJECT_CONTEXT.md` before changes
- Check existing files for patterns before writing new code
- Follow the project's established architecture flow (see PROJECT_CONTEXT.md)
- Validate input in every mutation
- Handle errors explicitly — don't swallow failures silently

### Ask First

- Schema or data model changes
- New dependencies
- New patterns not established in the project
- Auth flow or middleware changes
- Deleting or renaming existing files
- Changes touching more than 3 files

### Never

- Business logic in UI components or API route handlers
- Skip auth/permission checks in server-side code
- Remove a failing test without explicit approval
- Rubber-stamp a review (every review must have specific feedback)

> **Note:** Project-specific "Never" rules are defined in `PROJECT_CONTEXT.md`.

---

## Session Management

When starting a session:

1. Check `.chat/` for the latest `session-handoff-*.md`
2. Read it for prior work, decisions, and pending items
3. Continue from where the previous session left off

When ending a session: use the `session-handoff` skill.

---

## Skill Recognition

While working, watch for patterns that should become reusable skills. Something is skill-worthy when:

1. **Recurring judgment** — the same non-obvious decision or reasoning process appears for the 2nd+ time across sessions
2. **Undocumented convention** — "how we do things" that isn't captured in any existing skill or PROJECT_CONTEXT.md
3. **Repeatable workflow** — a multi-step process the user describes as "whenever I do X, I always need to Y then Z"
4. **Fragile expertise** — knowledge that would need to be re-discovered if this session's context disappeared

**Threshold:** Suggest only when (a) the pattern has appeared at least twice AND (b) no existing skill already covers it. Do not suggest on every vague pattern.

**When you spot one, suggest briefly:**

> "This looks like reusable expertise — [one-line description]. Want to package it as a skill? You can invoke `@skill-creator`."

Then continue with the current task. Do not derail the workflow.
