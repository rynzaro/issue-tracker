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

### Step 1 — User Reviews First (Same Checklist)

Give the user the SAME checklist the agent will use, and ask them to evaluate:

> "Run through this checklist on the code. For each item, mark it pass/fail/unsure with a brief note:
>
> **Mandatory 5 (check these first):**
>
> 1. Auth check present in every server action?
> 2. Zod validation on all mutation inputs?
> 3. `deletedAt IS NULL` in all queries?
> 4. Error paths handled (not just happy path)?
> 5. Business logic in services only (not actions or components)?
>
> **Deep dive (check if mandatory 5 all pass):** 6. Server action follows the 5-step pattern (auth → validate → service → revalidate → return)? 7. No banned patterns (DB cascades, Toggl imports outside feature, env secrets)? 8. Null/undefined inputs handled? 9. Soft-deleted records can't leak through? 10. Return types match what callers expect?"

Wait for the user's response.

### Step 2 — Agent Review

Apply the same checklist independently. Also check:

- Event emission after mutations (if iteration 2+ rules active)
- Checkpoint triggers (if iteration 3+ rules active)
- Concurrent access / race conditions (flag difficulty — this is advanced)
- Test coverage implications

### Step 3 — Gap Analysis

Compare item by item:

- **Caught correctly**: Validate their instinct. "Good eye — the missing `deletedAt` filter on line X would have leaked soft-deleted records."
- **Missed**: Explain WHY it matters, not just WHAT. "This missing auth check means any unauthenticated request could trigger the mutation. In production, that's a data integrity risk."
- **Overcaution (high learning value)**: When the user flags something that isn't actually a problem, explain why it's fine. "You flagged the missing transaction, but these two operations are idempotent — a partial failure state is recoverable. Transactions add overhead you don't need here." This calibrates their severity judgment.

### Step 4 — Score

Rate:

- **Architecture & Patterns**: Did they check architecture compliance, or only syntax?
- **Testing Strategy**: Did they think about whether this code is testable?
- **Tradeoff Analysis**: Did they prioritize correctly? (Correctness bugs > security gaps > architecture violations > style)

A senior reviewer catches the important issues AND correctly deprioritizes the unimportant ones. Track both.
