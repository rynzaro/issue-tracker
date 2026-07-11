---
name: teaching
description: Use when Felix wants to understand design concepts — behind code he wrote, a proposed change, or a decision at the ticket gate — asks "what concept applies here", "why is this superior", "help me learn from this", or pushes back on a deliverable wanting the ideas instead of a write-up.
---

# Teaching

The deliverable is a **lesson, not a work product**. Teach named design principles with Felix's own code as the case study: his real flaw (or real strength) is the hook, the principle explains it, the superior shape resolves it. He implements himself — a lesson never ends in an implementation plan.

## Lesson contract

3–6 sections, one concept each, five slots in order:

1. **The principle** — named, 1–2 sentences, sourced (Parnas's information hiding, Ousterhout's deep modules, Feathers's seams…). Use the `codebase-design` skill's vocabulary exactly.
2. **What the code did** — the flaw in *his* code, `file:line` verified against the current working tree.
3. **The superior shape** — the alternative design, concretely, in his code's terms.
4. **Why it wins** — the causal argument (leverage, locality, testability), not taste.
5. **Recall** — one retrieval question he can self-test with later.

After the sections:

- **Judgment calls** — decisions principle *cannot* settle, listed separately, explicitly his. Never fold into "the superior shape" as if derived.
- **Going deeper** — 2–4 primary sources, one line each on what it adds.

## Method

- **Storage strength over fluency.** A lesson that merely feels clear is failing — understanding at lesson-time decays without retrieval. Build retention deliberately: recall slots are retrieval practice; extending an existing note spaces the material; make questions effortful. The real test is whether he can re-derive the decision cold later.
- **Zone of proximal development.** Pitch each section just past what his code shows he already does right. Name what he got right when it's the same pattern — it anchors the concept.
- **Interactive when unclear.** Comprehension in doubt mid-lesson → stop, ask one question (a prediction or a choice between options), continue from his answer. Quiz options equal length — no formatting hints toward the answer.
- **Visual when structure beats prose.** Hierarchies, seams, data flow, before/after shapes → diagram (ASCII or mermaid inline; artifact when richer). At most one visual per concept.

## Storage

Lessons live in `docs/learning/` (see its README). Extend an existing note on the topic in place rather than creating siblings — one recitable home per concept cluster. Notes are Felix's personal study material: extended when he asks, allowed to lag the code.

## At the ticket gate

When a lesson runs as the learning phase before a ticket (see CLAUDE.md contract), the recall slot doubles as the decision-test seed, and his answer is the gate evidence.

## Common mistakes

| Mistake | Fix |
|---|---|
| Sliding into an implementation checklist | Steps belong in his hands; the lesson ends at "why it wins" |
| Abstract lecture first, code as afterthought | The flaw in his code opens every section |
| Judgment call presented as the derived answer | Separate "principle says" from "you decide" |
| Citing stale line numbers | Re-verify every ref; lessons outlive the code they cite |
| Only praising or only critiquing | Name the matching strength when the pattern already exists in his code |
