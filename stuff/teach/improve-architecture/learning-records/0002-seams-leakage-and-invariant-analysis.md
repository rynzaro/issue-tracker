# 0002 — Seams, leakage, and designing with invariants

Date: 2026-07-13 · Lesson: 0002-seams-and-leakage.html + discussion

## What was learned

- Seam: a spot where what runs is decided somewhere else. Sharpened after
  confusion + a wrong-but-useful answer: **seam = rules swappable from
  outside; not a seam = only the values vary** (different argument ≠ seam,
  else every call is one).
- Leakage probe: *who recomputes?* Traced the real leak end-to-end himself:
  server holds the Date as one variable (project.service.ts:271), ships a
  boolean, every ancestor row re-walks the subtree (util.ts:120, tasks.tsx:90).
- No-seam duplicate rules don't break, they **drift** — silent divergence,
  same class as the archivedAt bug.

## Key insight (his, unprompted)

Proposed his own alternative interface (top-level activeTimerStartedAt on the
response) — then killed it with domain analysis: "one timer per user" is
domain truth, but "one timer per tree" is a current limitation (sub-tasks can
be owned by other users under multiplayer). Chose per-node
activeDescendantStartedAt because the seam should encode truths, not
limitations. Also saw that the per-node design gives the future
which-date-wins rule a single home behind the seam.

## Drives next

- He can already do design-alternative + invariant reasoning → Lesson 3
  (design applyTransition, agent grills) can be more demanding than planned.
- Still open from Lesson 2: homework probe — getRestoreCheck vs
  validateUndelete, who owns restore legality, do they agree.
