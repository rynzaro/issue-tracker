---
name: tradeoff-coach
description: "LEARN-only. Trigger when a decision involves tradeoffs, when the user states a decision as fact without considering alternatives, or when explicitly asked to evaluate options."
---

# Tradeoff Coach Skill (LEARN Only)

## Purpose

"EVERYTHING IS A TRADEOFF." This skill surfaces the tradeoffs in engineering decisions and coaches the user to evaluate them. Reasoning is the important skill — not the decision itself.

---

## When to Trigger

- During planning when multiple approaches exist
- When the user states a decision as fact without reasoning ("I'll use a transaction") vs. as a choice ("I'm choosing a transaction because...")
- When asked "should I use X or Y?"
- When a new architecture decision is being made
- Proactively, when the agent notices an implicit tradeoff the user hasn't acknowledged

**How to detect:** A decision stated as fact skips the "because." A decision stated as a choice includes reasoning. Coach on the former, not the latter.

---

## Behavior

### Step 1 — Surface the Tradeoff

Present the decision point with concrete alternatives:

> "There's a tradeoff here. [Approach A] gives you [specific benefit] but costs [specific cost]. [Approach B] gives you [different benefit] but costs [different cost]."

Always present at least 2 alternatives. Use specifics from this project, not abstractions.

**Project-specific examples to draw from:**

- AD-16: Per-task TimeEntries vs. ancestor-chain TimeEntries (storage simplicity vs. query simplicity)
- AD-17: Separate ActiveTimer table vs. nullable stoppedAt on TimeEntry (structural invariant vs. simpler schema)
- AD-10: App-level cascade vs. DB cascade vs. no cascade (control vs. performance vs. simplicity)
- AD-8: Datetime flags vs. status enum (flexibility vs. explicitness)

### Step 2 — User Evaluates

> "Which approach would you choose, and why? What's the deciding factor?"

Wait for the user's response.

### Step 3 — Probe the Reasoning

Don't accept surface answers. Push on the specific dimension:

- **"It's simpler"** → "Simpler in what dimension? Development time? Runtime complexity? Cognitive load for the next person reading this?"
- **"It's safer"** → "Safer against what failure mode specifically? What's the probability and impact of that failure?"
- **"It's the standard way"** → "Standard in what context? Does our project's specific constraint (solo dev, MariaDB, Next.js server actions) change the calculus?"
- **"It's more extensible"** → "What specific extension are you preparing for? Is that extension likely enough to justify the cost now?"

Then ask:

> "What would change your answer? Under what conditions would the other approach be better?"

### Step 4 — Reveal and Discuss

Share the agent's evaluation:

- Which approach the agent favors and the deciding factor
- What the user's reasoning got right (validate)
- What dimension the user didn't consider (expand)
- How this connects to existing ADs in the project (contextualize)

### Step 5 — Score (adaptive)

For focused tradeoffs (single decision):

- **Tradeoff Analysis** only

For tradeoffs with system-wide implications:

- **Tradeoff Analysis** + **System Thinking**

For tradeoffs involving architectural patterns:

- **Tradeoff Analysis** + **Architecture & Patterns**

Score only the relevant categories, not all three every time.

---

## Judgment, Not Procedure

The mark of seniority is not picking the right answer — it's articulating WHY an answer is right IN THIS CONTEXT and knowing what conditions would make a different answer right. Track whether the user can:

1. Name the axes of the tradeoff (not just "pros and cons")
2. Identify the deciding factor for THIS project
3. State what would flip their decision
