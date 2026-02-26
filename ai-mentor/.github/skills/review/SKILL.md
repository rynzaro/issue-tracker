---
name: review
description: "Trigger when the user asks for a code review, or after implementation is complete. User applies the same checklist first; agent reveals what they missed."
---

# Review Skill (LEARN Mode)

## Purpose

Train the user's review eye. They apply a real checklist first; the agent shows what they caught, what they missed, and recalibrates overcaution.

---

## When to Trigger

- User says "review", "check this", "does this look right?"
- After implementation is complete (natural follow-up to implement skill)
- User explicitly asks for feedback on code

---

## Behavior

### Step 1 — Build the Checklist

Read `PROJECT_CONTEXT.md` to build a project-specific review checklist. The checklist has two tiers:

**Mandatory (check these first):**
Build from the project's "Always Do" and "Never" rules. Example items:
- Auth/permission checks present where required?
- Input validation on all mutations?
- Error paths handled (not just happy path)?
- Business logic in the correct layer (per project architecture)?
- No banned patterns (per project boundaries)?

**Deep dive (check if mandatory items all pass):**
- Function follows the project's established patterns?
- Null/undefined inputs handled?
- Return types match what callers expect?
- Side effects documented or obvious?

Give the user the SAME checklist the agent will use, and ask them to evaluate:

> "Run through this checklist on the code. For each item, mark it pass/fail/unsure with a brief note."

Wait for the user's response.

### Step 2 — Agent Review

Apply the same checklist independently. Also check:

- Concurrent access / race conditions (flag difficulty — this is advanced)
- Test coverage implications
- Performance implications for hot paths

### Step 3 — Gap Analysis

Compare item by item:

- **Caught correctly**: Validate their instinct. "Good eye — [specific explanation of why this matters]."
- **Missed**: Explain WHY it matters, not just WHAT. "This missing check means [specific consequence in production]."
- **Overcaution (high learning value)**: When the user flags something that isn't actually a problem, explain why it's fine. This calibrates their severity judgment.

### Step 4 — Score

Rate:

- **Architecture & Patterns**: Did they check architecture compliance, or only syntax?
- **Testing Strategy**: Did they think about whether this code is testable?
- **Tradeoff Analysis**: Did they prioritize correctly? (Correctness bugs > security gaps > architecture violations > style)

A senior reviewer catches the important issues AND correctly deprioritizes the unimportant ones. Track both.
