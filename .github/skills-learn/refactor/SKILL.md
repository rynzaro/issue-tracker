---
name: refactor
description: "Trigger when the user wants to refactor, improve, or clean up code, or when the agent identifies a code smell. Validates the timing, forces root-cause identification before solution, and compares approaches."
---

# Refactor Skill (LEARN Mode)

## Purpose

Refactoring requires two skills: identifying the right problem AND knowing when to fix it. The user practices both.

---

## When to Trigger

- User says "refactor", "clean up", "improve", "simplify"
- Agent notices a code smell during review or implementation
- User asks about technical debt

---

## Behavior

### Step 0 — Right Time Check

Before any refactoring work, evaluate:

> "Is this the right time to refactor? Consider:
>
> - Is this smell blocking current work, or is it cosmetic?
> - Will this refactoring cascade into other files (high blast radius)?
> - Is there a pending feature that will change this code anyway?"

If agent-initiated: present the smell and ask the user whether it's worth addressing now.
If user-initiated: validate that the code is actually a smell (sometimes the user wants to "improve" code that's already fine — flag that).

### Step 1 — Identify Root Cause (Before Solution)

Whether the smell was found by agent or user, ask:

> "Before we talk solutions — what's the ROOT CAUSE of this smell? Why does this code look/feel wrong?"

Wait for the user's response. This MUST come before any solution discussion.

Common root causes to check against:

- Responsibility in the wrong layer (logic in component instead of service)
- Missing abstraction (repeated patterns that should be extracted)
- Leaky abstraction (implementation detail exposed to callers)
- Historical accident (code evolved without refactoring)
- Over-engineering (abstraction that adds complexity without value)

### Step 2 — User Proposes Fix

> "Now that we've identified the root cause — how would you fix it?
>
> 1. What changes would you make?
> 2. What behaviors MUST stay the same (preserved contracts)?"

Wait for the user's response.

### Step 3 — Compare Approaches

Present the agent's approach alongside the user's:

- **Where they aligned** — good instincts, explain why
- **Where they diverged** — explain the tradeoff between the two approaches
- **What the user's approach risks** — behaviors that might break, blast radius
- **What the agent's approach costs** — additional complexity, files touched

### Step 4 — Implement After Agreement

Wait for agreement on the approach. Then apply the refactoring.

**Verify no behavior changed**: Run tests if available. If no tests exist, do before/after contract comparison — same inputs should produce same outputs. If the refactoring changes behavior, that's a feature change, not a refactor — flag it.

### Step 5 — Score

Rate:

- **Architecture & Patterns**: Did they identify the right pattern to apply?
- **Tradeoff Analysis**: Did they weigh the cost of refactoring against the cost of leaving it?

---

## Judgment, Not Procedure

The senior instinct is knowing when NOT to refactor. The three signs of premature refactoring:

1. The code works and isn't blocking anything
2. A pending feature will touch the same code
3. The "improvement" adds abstraction without reducing complexity

Track whether the user demonstrates this restraint.
