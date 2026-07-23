# D-05 — Checkpoint authorship with a second actor

**Status:** RESOLVED 2026-07-23 — Option A

## Context

This is the decision the rubric flags as hardest: what checkpoints *mean* when
a second actor is creating subtasks under the host.

A checkpoint records a **settled judgement** — what a person believed the plan
was (ADR-0021/0022). Today every checkpoint is authored by the one user, so
"whose judgement" is trivial. With a Task Member:

- The member adding a subtask is a `SCOPE_CHANGE` — a **plan checkpoint**
  trigger (ADR-0022). But the plan being changed is the *host task's plan*,
  and the host's plan belongs to the **host owner**, not the member. Whose
  settled judgement is it? The member decided to add a child; the owner did
  not. ADR-0021's "an estimate is a claim its author may be wrong about"
  implies the author matters — but here the author (member) and the plan-owner
  (host owner) differ.
- The host's parent holds the cross-section that now contains the member's
  new child as a column (`CheckpointTask`, invariant 3). The member's
  subtask estimate lands in the *owner's* parent checkpoint. So a member's
  planning judgement contaminates (or contributes to) the owner's belief
  record — and the owner's estimate-accuracy analysis (#26) grades it.
- `WORK_STARTED` by a member on their own subtask is a **reality checkpoint**
  and a **baseline** for that subtask (first WORK_STARTED, per-task). Clean —
  it's the member's own task. But does it also close the *host's* plan-window
  (ADR-0022: WORK_STARTED closes the plan window)? A member starting work
  would force-close the owner's open plan checkpoint — almost certainly wrong.
- `TASK_COMPLETED` on a member's subtask fires a reality checkpoint on the
  *host* (the interesting snapshot at completion is the siblings, ADR-0022).
  Now the siblings are partly other members' work. Whose belief is recorded?

The three-records-one-home rule (ADR-0021) and the per-principal nature of
estimation evidence (D-04) both push toward: **checkpoints are per-author**.

## Decision

Are checkpoints authored per-principal (each person's plan/belief is their own
checkpoint stream), or does the host task carry one shared checkpoint stream
that a second actor's edits write into? And does a member's `WORK_STARTED`
close the host owner's plan window?

## Options

- **A. Per-principal checkpoints.** Each `Checkpoint` row carries the author
  (`createdById`); a person's baseline/plan/reality checkpoints describe *their*
  plan. A member's subtask creation writes the member's plan checkpoint (their
  judgement) and the column appears in the host owner's parent cross-section
  only as a *fact about the world* (the child exists), not as the owner's
  belief about its estimate. Estimate-accuracy analysis grades each principal
  against their own checkpoints. Cleanest with the estimation-evidence
  principle; likely needs a schema addition (`Checkpoint.createdById`).
- **B. Shared host-owner checkpoint stream.** All checkpoints on the host
  subtree belong to the host owner; a member's edits are attributed to the
  member in `TaskEvent` (the ledger already records the actor) but the belief
  is the owner's. Simpler schema; but it grades the owner against plans the
  owner didn't author — exactly the contamination D-04 exists to prevent.
- **C. Split by trigger family.** Plan checkpoints per-author (a judgement is
  personal); reality checkpoints shared (they record what the world forced, and
  "the world" includes other actors' completions). Hybrid; matches ADR-0022's
  authored-by distinction (plan = user, reality = world) but needs a clear rule
  for whose baseline a member's subtask gets.

## Resolution (2026-07-23)

**Option A — per-principal checkpoints.** Each `Checkpoint` row carries a
`createdById` (schema addition). A member's actions write checkpoints in the
_member's own stream_; the host owner's stream remains theirs.

Specific rules:
- A member adding a child under the host is a `SCOPE_CHANGE` **plan checkpoint**
  authored by the member on the host task. The new child appears in the host
  owner's parent cross-section only as a *fact* (a `CheckpointTask` column), not
  as the owner's belief.
- A member's `WORK_STARTED` on their own subtask is the member's reality
  checkpoint and the subtask's baseline. It **does not** close the host owner's
  plan window — debounce windows are per-principal. The owner may still be
  editing their own plan when the member starts work.
- A member's `TASK_COMPLETED` on their own subtask fires a reality checkpoint on
  the *host* authored by the member, recording what the member still believed
  about their own subtree and the visible siblings at that moment.

Read asymmetry accepted (D-03-A): a member can create children that become
columns in a host-parent checkpoint the member cannot read. The owner owns the
host plan; the member owns their subtree.

Consequences:
- `Checkpoint` schema gains `createdById` plus relation to `User`.
- `CheckpointTask` attribution stays unchanged; attribution of the *cross-section*
  moves to `Checkpoint.createdById`.
- Analysis (#26) grades each principal against their own checkpoint stream
  (D-08-A).

## Implementation note (2026-07-23)

- Schema: `Checkpoint.createdById` added to `prisma/schema.prisma`; Prisma
  client regenerated.
- `lib/services/checkpoint.service.ts` updated with the per-principal design
  contract. The actual checkpoint creation/debounce/baseline service is
  Iteration 3 work and currently a placeholder; when it lands it must pass the
  acting principal as `createdById` and never default to `project.userId`.

## Blocking edges

- **Blocks:** D-08 (analysis grading scope), and the checkpoint-service
  rework for multiplayer.
- **Blocked by:** D-02 (membership anchor sets what subtree a member touches),
  D-04 (execution authority sets who completes/baselines what),
  D-03 (visibility sets which cross-sections exist for a member),
  D-07 (member structural authority sets whether adding a child is even the
  member's authored act).