# Philosophy

The learning science, design principles, and anti-patterns behind AI Mentor.

---

## How People Learn Well

Research on expertise development converges on consistent principles that shaped every design decision in this system.

### Deliberate Practice Over Repetition

Repeating what you already know doesn't grow competence. Growth requires working at the edge of ability — tasks that are possible but uncomfortable. The system calibrates difficulty to the learner: beginners get specs + hints + review (they do the work); advanced learners get agent implementation + tradeoff quizzes (they evaluate the reasoning).

### Immediate, Specific Feedback

The gap between action and feedback determines learning rate. "This is wrong" teaches nothing. "You validated input but didn't handle the case where the array is empty — that will throw at runtime and the error message will point three layers away from the actual problem" teaches precisely.

Every scored interaction cites the _specific_ reasoning gap, not a general impression.

### Construction Over Consumption

Reading code teaches little. Writing code and having its reasoning examined — "why did you structure it this way?" — teaches deeply. When the agent does the work, the interaction flips: the learner explains the tradeoffs, not the agent.

### Interleaving

Practicing plan→plan→plan is less effective than plan→implement→review→plan. The skill architecture naturally interleaves because real work interleaves. The system doesn't force skill isolation.

### Metacognition

The most powerful learning happens when people learn to evaluate their _own_ reasoning. The profile system externalizes this: "you consistently miss error handling edge cases" becomes visible evidence the learner can act on, rather than a vague feeling.

### Zone of Proximal Development

Tasks slightly beyond current ability, with scaffolding that can be gradually removed. LEARN mode provides scaffolding (spec gates, hint systems, quizzes). FAST mode removes it. The learner decides when to switch.

---

## Decisions a Learner Must Make

These are the strategic choices that shape a growth trajectory. The system illuminates them — it doesn't make them for you.

| Decision                    | What the System Does                                                                     |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| **What to learn**           | Profile shows weaknesses; you choose which to address                                    |
| **Depth vs. breadth**       | Category ratings reveal gaps; you decide whether to deepen strength or shore up weakness |
| **Speed vs. understanding** | FAST vs. LEARN mode — you choose when velocity matters more                              |
| **When to ask for help**    | Hints point to files and patterns, not solutions — making "help" a learning moment       |
| **What "good" means**       | Onboarding asks you; the system mirrors your definition back to you                      |
| **When to stop**            | "Good enough" is a valid skill-level decision — the system doesn't always push for more  |

---

## How Agents and Skills Support Learning

### Skills = Training

Skills encode _how to think about_ a type of work. A skill doesn't say "run these 5 commands." It says "before you implement, verify you have a spec with these 3 minimums, because without them the code becomes a house of cards." Skills capture judgment, not procedure.

### Agents = Tools

Agents perform specific multi-step workflows. The onboarding agent interviews you about your goals and generates a calibrated starting point. The skill-creator agent packages new expertise. They're the machinery; skills are the methodology.

### Progressive Disclosure

The system loads only what's relevant. Global instructions always. Skills on trigger. Agent context when invoked. This prevents cognitive overload — the biggest enemy of learning systems.

### Scaffolding That Fades

LEARN mode provides guardrails. FAST mode removes them. The learner controls the transition. The system doesn't decide you're "ready."

### Externalized Memory

PROFILE.md, evidence logs, session handoffs — these solve the "it disappears when context is lost" problem. Growth is recorded, patterns are visible, and sessions can continue across weeks.

---

## Anti-Patterns: What We Don't Do

### Don't Remove the Struggle

The temptation is to make everything easy. Resist it. Struggle at the right level is where learning happens. The "hints not solutions" principle is sacred.

### Don't Over-Assess

If every interaction ends with a quiz and a score, the system becomes exhausting. Scoring happens _within_ the workflow, not as a separate ceremony. "You handled this edge case well" mid-review is better than a formal rubric at the end.

### Don't Flatten to Checklists

Checklists capture procedure. Skills must capture judgment. "Always validate input" is a checklist item. "Validate input because unvalidated data cascades through 3 layers before failing, and the error message will point to the wrong place" is judgment.

### Don't Compare to Others

The profile tracks _your_ growth against _your_ baseline. No leaderboards, no "you're behind," no implicit competition. Growth is personal.

### Don't Rush Tier Transitions

Moving from mid-level to senior isn't a promotion to celebrate. It's a pattern that emerges from evidence. The system doesn't gamify the tiers.

### Don't Ignore Non-Code Skills

Tradeoff analysis, system thinking, documentation judgment — these are as important as implementation quality. The profile includes them explicitly.

### Don't Teach in Isolation

Skills trigger during real work, not in sandboxed exercises. The learning context is the production codebase, the real constraints, the actual deadlines.

---

## Habits of Highly Skilled Engineers

These are observable behaviors tracked over time — present/absent, not rated 1-5. The system holds up a mirror; it doesn't assign a grade.

| Habit                                    | What It Looks Like                                                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Read before write**                    | Opens existing code, understands patterns, then implements. Doesn't start from scratch.                      |
| **Name what they don't know**            | Says "I'm not sure about X" upfront. Treats uncertainty as information, not weakness.                        |
| **Think in systems**                     | Asks "what else does this affect?" before changing code. Sees downstream consequences.                       |
| **Write for the next reader**            | Code and docs explain _why_, not just _what_. Assumes the reader has no context.                             |
| **Know when to stop**                    | Ships "good enough" deliberately, not accidentally. Articulates what's left and why it's acceptable.         |
| **Make decisions reversible**            | Defaults to approaches that can be changed later. Avoids one-way doors without explicit acknowledgment.      |
| **Separate signal from noise**           | In reviews: distinguishes correctness issues from style preferences. In debugging: narrows before expanding. |
| **Document decisions**                   | Captures not just what was decided, but why, and what was rejected.                                          |
| **Maintain velocity through discipline** | Doesn't skip tests to go faster. Knows that shortcuts compound into slowdowns.                               |
| **Teach by asking**                      | When helping others, asks "what would happen if..." instead of giving the answer.                            |

---

## Design Principles Summary

1. **Judgment over procedure** — every skill teaches _why_, not just _what_
2. **Evidence over impression** — every rating change cites a specific interaction
3. **Autonomy over imposition** — the learner chooses pace, focus, and mode
4. **Integration over isolation** — learning happens in real work, not sandboxes
5. **Scaffolding over simplification** — make hard things possible, not easy
6. **Mirror over judge** — the system shows you your patterns; you decide what to do about them
