---
name: plan
description: "Trigger when the user asks to plan work, decompose a feature, break down a task, or start an iteration. Guides collaborative planning where the user reasons about decomposition before the agent refines it."
---

# Plan Skill (LEARN Mode)

## Purpose

Teach planning as a reasoning skill. The user practices decomposing work; the agent independently compares, refines, and scores.

---

## When to Trigger

- User says "plan", "break down", "decompose", "what should we do for...", "how should I approach..."
- Start of a new iteration or feature
- User asks for a task list or step-by-step approach

---

## Behavior

### Step 1 — Context

Read `PROJECT_CONTEXT.md` (architecture patterns, key files, boundaries).
Deliberate on scope using Sequential Thinking MCP before proceeding.

### Step 2 — Agent Plans First (Hidden)

Generate your own decomposition BEFORE seeing the user's. This prevents anchoring to their framing. Hold it internally — do not reveal it yet.

### Step 3 — User-First Decomposition

Ask the user:

> "Before I show my plan, take a shot at decomposing this. List the steps in dependency order — for each step, note which file(s) it touches and what depends on what. Don't worry about getting it perfect — the reasoning matters more than the answer."

If the user's PROFILE.md rating for Architecture & Patterns is Junior (1.x), offer an alternative:

> "Or if you'd prefer, I can show you a partial plan with gaps — you fill in the missing steps."

Wait for the user's response.

### Step 4 — Compare and Refine

Present the comparison:

- **What aligned** — validate their correct instincts and explain why those were good calls
- **What they missed** — explain what thinking would have caught it (e.g., "the architecture pattern in PROJECT_CONTEXT.md means this needs an intermediate layer")
- **What was over-scoped** — if they included unnecessary work, explain why less is better here
- **Dependency errors** — if their ordering would cause issues

Connect each observation to specific project patterns or documented decisions.

### Step 5 — Present Final Plan

Output a numbered, dependency-ordered step list. Each step:

1. **What** — the concrete change
2. **Where** — file(s) affected
3. **Why** — rationale connecting to architecture
4. **Depends on** — which prior steps must complete first

### Step 6 — Score (non-trivial plans only)

Score only when the plan has 3+ steps. For simple 1–2 step tasks, skip scoring.

Rate:

- **Architecture & Patterns**: Did they route work through the right layers?
- **System Thinking**: Did they see dependencies, ordering, and downstream effects?
- **Tradeoff Analysis**: Did they consider what to EXCLUDE (scope discipline)?

Log evidence to `PROFILE.md` with date, category, rating, and specific reasoning.

---

## Judgment, Not Procedure

Don't just check whether the user listed the right steps. Evaluate HOW they reasoned:

- **Top-down (senior)**: Starts from the architecture pattern, decomposes through layers, identifies dependencies between layers.
- **Bottom-up (mid-level)**: Starts from the UI, works backward to data layer.
- **Feature-list (junior)**: Lists visible features without considering the layers beneath them.

The progression from bottom-up to top-down is the key growth signal for planning skill.
