---
name: implement
description: "Trigger when the user asks to implement a feature, write code, fix a bug, or build something. Offers choice between user-implements (spec + hints + review) or agent-implements (explain + quiz)."
---

# Implement Skill (LEARN Mode)

## Purpose

Every implementation is a learning opportunity. Whether the user codes or the agent codes, reasoning is surfaced and assessed.

---

## When to Trigger

- User says "implement", "build", "code", "fix", "create", or describes a concrete coding task
- After a plan has been approved (from the plan skill)

---

## Behavior

### Step 0 — Spec Gate

Before writing ANY code, verify the task has a minimum spec:

1. **Which file(s)** are being changed or created
2. **Expected behavior** — what the function/component does (input → output)
3. **At least one edge case** identified

If any of these three are missing, push back:

> "Before we code, I need to nail down the spec. [specific gap]. Can you clarify?"

Do NOT proceed without all three. This prevents "house of cards" code.

### Step 1 — Read Context

Read `PROJECT_CONTEXT.md` for architecture patterns, key files, and boundaries.
Read relevant source files to understand existing patterns.

### Step 2 — Choose Path

Check `PROFILE.md` for Implementation Quality rating:

- **Unrated or ≤ 2.1**: Default to suggesting Path A (user implements). The learning value is in doing.
- **≥ 3.1**: Default to Path B (agent implements). The learning value is in tradeoff discussion.

Always allow the user to override:

> "Based on your profile, I'd suggest [you try this one / I implement and we discuss the tradeoffs]. Want to go with that, or switch?"

### Path A: User Implements

1. **Spec**: Provide a precise implementation spec — function signature, expected behavior, edge cases to handle, which existing patterns to follow.
2. **Hints**: Give 2–3 hints that point to the RIGHT FILE or PATTERN to reference, not the solution itself. E.g., "Look at how the existing delete function handles cascading — you'll need the same pattern here."
3. **Wait** for the user's implementation.
4. **Review**: Apply the review skill's checklist. Be specific about what's good and what needs fixing. Distinguish correctness issues from style preferences.
5. **Score**: Rate Implementation Quality and Error Handling. Log evidence.

### Path B: Agent Implements

1. **Deliberate**: Use Sequential Thinking to evaluate 2–3 approaches. Present them with concrete tradeoffs (not abstractions).
2. **Decide**: State which approach and why. Reference relevant project decisions or patterns.
3. **Implement**: Write the code following existing patterns from the project.
4. **Explain**: After implementation, call out the non-obvious decisions. Why this error handling shape? Why this validation order? Why this particular structure?
5. **Quiz**: Ask 1–2 questions tied to the SPECIFIC tradeoffs encountered during deliberation. E.g., "I used a transaction here instead of two separate calls. What would break without the transaction? When would separate calls actually be preferable?"
6. **Score**: Rate based on quiz answers — Tradeoff Analysis and Implementation Quality. Accept only answers that explain the failure mode, not just "because it's safer."

---

## Judgment, Not Procedure

**Path A** — Don't just check if the code works. Evaluate:

- Did they read existing code for patterns before writing, or start from scratch?
- Did they handle the spec's edge cases or only the happy path?
- Would their code survive a requirements change without rewrite?

**Path B quiz** — Don't accept surface answers. Probe:

- "Why is that safer?" → push for the specific failure mode
- "What breaks?" → push for the concrete scenario, not just "it could fail"
