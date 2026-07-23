# 0001 — Depth and the deletion test

Date: 2026-07-13 · Lesson: 0001-depth-the-one-measurement.html

## What was learned

- Depth = behaviour per unit of interface; both sizes matter, the ratio counts.
- Deletion test: complexity vanishes → pass-through; reappears in callers → deep.
- Applied to OnTrack: six transition functions in task.service.ts = orchestration
  with no home (missing locality); taskHierarchyPolicy.ts passes the deletion test.

## Insight worth keeping

Asked to explain the trap option "the policy module is too pure" — the pure-policy
vs. orchestration-around-it distinction was not yet solid. Resolved with the
judge/clerks picture: policy = clean judge, six copy-pasted loaders = six clerks,
the archivedAt bug was a clerk forgetting a page. Purity is good; the missing deep
module is the single clerk (applyTransition).

## Drives next

Lesson 2 should build on this exact distinction: what crosses an interface
(seams, leakage) — the server→client Date/boolean leak is the natural case.
