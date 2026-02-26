---
name: learner-profile
description: "LEARN-only. Manages PROFILE.md — establishes baselines, calibrates ratings, logs evidence, tracks habits, suggests focus areas. Trigger after any scored interaction or when user asks about progress."
---

# Learner Profile Skill (LEARN Only)

## Purpose

Persistent, evidence-based tracking of engineering competency growth. Every rating change is backed by a specific interaction, not a general impression.

---

## When to Trigger

- After any skill interaction that produces a score
- User asks "how am I doing?", "what should I focus on?", "show my profile"
- Start of a new session (briefly review profile to calibrate skill difficulty)

---

## Behavior

### After a Scored Interaction

1. Read current `PROFILE.md`
2. Determine the category and check if a baseline exists

**If no baseline (fewer than 3 interactions in this category):**

- Log the interaction as evidence but do NOT assign a rating yet
- After the 3rd interaction, set the initial baseline rating based on the pattern across all 3

**If baseline exists:**

- Compare this interaction's performance against the current rating's expected level
- Decide if a rating adjustment is warranted (see Movement Rules below)
- Update `PROFILE.md`:
  - Adjust rating if warranted
  - Add evidence entry (see format below)
  - Update focus areas if a pattern emerges
  - Increment session count

### Habit Tracking

During any interaction, observe and log habit presence/absence:

- **Read before write**: Did the user examine existing code before writing new code?
- **Name what they don't know**: Did they acknowledge uncertainty upfront?
- **Think in systems**: Did they consider downstream effects?
- **Write for the next reader**: Did their code/docs explain "why"?
- **Know when to stop**: Did they ship "good enough" deliberately?
- **Make decisions reversible**: Did they default to changeable approaches?
- **Separate signal from noise**: Did they distinguish important issues from minor ones?
- **Document decisions**: Did they capture rationale?
- **Maintain velocity through discipline**: Did they do the right thing even when faster alternatives existed?
- **Teach by asking**: When explaining, did they ask questions instead of giving answers?

Update the Habit Observations table: increment Observed or Not Observed, update Last Seen date.

Do NOT rate habits numerically. Track presence/absence only.

### Evidence Format

Every evidence entry must be specific, not generic:

```
[YYYY-MM-DD] Category: X.X → X.X | [specific observation]
```

**Good evidence:** `[2026-02-23] Tradeoff Analysis: 2.1 → 2.2 | Correctly identified that BFS cascade trades query count for atomicity control. Named the reversal condition.`

**Bad evidence:** `[2026-02-23] Tradeoff Analysis: 2.1 → 2.2 | Good answer about tradeoffs.`

If you can't write specific evidence, the rating shouldn't change.

### When User Asks About Progress

Present:

1. **Current ratings** — table with category, rating, tier, trend arrow (↑ improving, → stable, ↓ declining)
2. **Habit observations** — table showing observation counts and patterns
3. **Progression deltas** — for each category with 5+ interactions: net change over all interactions
4. **Recent evidence** — last 5–10 entries
5. **Focus recommendation** — the 1–2 categories with the most growth potential

### Rating Movement Rules

- **Small moves**: Typical change is ±0.1. A ±0.2 requires strong evidence. A ±0.3 requires exceptional evidence.
- **Don't inflate**: Completing a basic task at the expected level doesn't raise the rating. Raising requires performance ABOVE the current tier.
- **Don't deflate on single incidents**: One mistake doesn't override a pattern. But 3 consecutive below-level performances warrant a downward adjustment.
- **Context matters**: A mid-level answer on a hard problem is worth more than a senior answer on a trivial one. Weight difficulty.
- **Require evidence**: Every rating change must cite the specific interaction. No change without a specific evidence string.

### Recalibration

Trigger recalibration when evidence shows a consistent PATTERN (3+ signals in the same direction within a category), not on a fixed schedule.

> "The last 3 interactions in [category] all showed [pattern]. The current rating is [X.X]. Based on the evidence, I'm adjusting to [Y.Y]. Here's why: [reasoning]."

### Focus Area Logic

A category becomes a focus area when:

- Current rating is established (baseline set) AND
- The last 3 interactions showed performance BELOW the current rating's expected level

Remove from focus when 2 consecutive interactions meet or exceed the rating's expected level.

---

## Rating Scale

| Tier | Range | Expected Performance |
|------|-------|---------------------|
| Junior | 1.1–1.3 | Needs guidance on fundamentals. Misses obvious patterns. |
| Mid-Level | 2.1–2.3 | Can implement with direction. Follows patterns but doesn't see why. |
| Senior | 3.1–3.3 | Makes sound independent decisions. Explains tradeoffs. Sees downstream effects. |
| Staff | 4.1–4.3 | Sees system-wide implications. Designs for future. Identifies what NOT to build. |
| Exceptional | 5.1–5.3 | Novel solutions. Teaches others. Challenges accepted patterns productively. |

## Categories

**Core (always tracked):**

1. Architecture & Patterns
2. Implementation Quality
3. Tradeoff Analysis
4. Testing Strategy
5. Data Modeling
6. Error Handling
7. System Thinking

**Optional (activate on second encounter):**

- Performance & Optimization — activate when work touches performance-sensitive areas for the 2nd time
- Security Awareness — activate when work touches auth, validation, or data exposure for the 2nd time
- Developer Experience / API Design — activate when work touches public interfaces or APIs for the 2nd time
