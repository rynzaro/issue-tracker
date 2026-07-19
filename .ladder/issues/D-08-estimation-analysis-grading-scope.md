# D-08 — Estimation-analysis grading scope under membership

**Status:** open (downstream)

## Context

The analytical core (CONTEXT.md): estimation error decomposes into **scope
error** (time on tasks not planned at baseline) and **effort error** (overrun
on planned tasks), graded from `existedAtBaseline` on `CheckpointTask`
(ADR-0021). Today one user, so "whose accuracy" is trivial. With a second
actor, the analysis dashboard (#26, not yet built) must decide:

- Does it grade each principal against **their own** checkpoints/baselines
  (per-principal, matching D-04/D-05-per-author)?
- Or does it grade the **project/task** as a unit (the owner's plan absorbing
  member contributions)?

FUTURE_COLLABORATION Phase 3 ("dual-perspective analysis": planner vs
executor, already enabled by `TaskTag.userId`) assumes the *project-level*
view: the planner's tags grade the planner's estimates; the executor's tags
grade the executor's time. That's a tagging-perspective split, not a
checkpoint-author split — it coexists with whatever D-05 decides but is
independent of it.

## Decision

Does estimate-accuracy analysis (#26) grade per-principal (each person's
estimates vs their own time) or per-project/per-task (one accuracy number
absorbing members)? And how does it relate to the Phase-3 dual-perspective
tag analysis?

## Options

- **A. Per-principal grading.** Each person's scope/effort error computed from
  their own checkpoints (D-05-A) and their own time entries. The host owner is
  not graded against a member's subtask estimate. Most consistent with
  estimation-evidence-is-personal; needs D-05-A.
- **B. Per-task/per-project grading.** One accuracy number per task, summing
  all contributors' time against the task's baseline. Simpler dashboard; but
  grades people against estimates they didn't make — the same contamination
  D-04 prevents for execution, now at the analysis layer.
- **C. Both views, Phase-3 as the bridge.** Per-principal accuracy (A) as the
  primary; the Phase-3 dual-perspective tag view as the cross-person lens
  ("how accurate were the estimates *I* tagged 'backend', regardless of who
  executed them"). Two views, one schema (`TaskTag.userId` + per-author
  checkpoints).

## Blocking edges

- **Blocks:** the analysis-dashboard design (#26).
- **Blocked by:** D-04 (execution authority → whose time is whose),
  D-05 (checkpoint authorship → whose baseline is graded).