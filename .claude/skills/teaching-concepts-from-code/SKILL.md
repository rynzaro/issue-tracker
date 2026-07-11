---
name: teaching-concepts-from-code
description: Use when Felix wants to understand the design concepts behind code he wrote or a proposed change — asks "what concept applies here", "why is this superior", "help me learn from this" — or pushes back on a deliverable wanting the ideas instead ("not interested in a write-up").
---

# Teaching Concepts from Code

## Overview

The deliverable is a **lesson, not a work product**. Teach named design principles using Felix's own code as the case study: his real flaw is the hook, the principle explains it, the superior shape resolves it. Never a step-by-step implementation plan — he implements himself to learn.

## When to use

- Felix asks why an approach is better, what he did wrong conceptually, or how to deepen his design knowledge.
- After an architecture/design review, when findings need to become understanding rather than tasks.

**Not for:** confirmed designs ready to record (→ ADR in `docs/adr/`), or routine changes he asked to have implemented.

## The lesson contract

A lesson is 3–6 sections, one concept each. Every section has exactly these five slots, in this order:

1. **The principle** — named, 1–2 sentences, with its source (e.g. Parnas's information hiding, Ousterhout's deep modules, Feathers's seams). Use the `codebase-design` skill's vocabulary exactly.
2. **What the code did** — the flaw in *his* code, with `file:line` evidence verified against the current working tree before citing.
3. **The superior shape** — the alternative design, concretely, in terms of his code.
4. **Why it wins** — the causal argument (leverage, locality, testability), not an assertion of taste.
5. **Recall** — one question he can self-test with later.

After the sections:

- **Judgment calls** — decisions principle *cannot* settle, listed separately and explicitly left to him. Never fold these into the "superior shape" as if derived.
- **Going deeper** — 2–4 primary sources (book/paper/talk), each with one line on what it adds.

## Storage

Lessons live in `docs/learning/` (see its README). Check for an existing note on the topic first — extend it in place rather than creating a sibling; his goal is one recitable home per concept cluster.

## Common mistakes

| Mistake | Fix |
|---|---|
| Sliding into an implementation checklist | Steps belong in his hands; the lesson ends at "why it wins" |
| Abstract lecture first, code as afterthought | The flaw in his code opens every section |
| Presenting a judgment call as the derived answer | Separate "principle says" from "you must decide" |
| Citing stale line numbers | Re-verify every ref; lessons outlive the code they cite |
| Only praising or only critiquing | Name what he already did right when it's the same pattern (e.g. an existing pure module) — it anchors the concept |
