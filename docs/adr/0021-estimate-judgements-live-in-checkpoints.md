# Estimate judgements live in checkpoints, not the ledger

Grilled 2026-07-17 (`/grill-with-docs`, #24). Three records, one home per fact:

- **Task fields** define **current state** (ADR-0007). The only authority.
- **TaskEvents** record **what happened** — the change log. They describe changes, never define state.
- **Checkpoints** record **what the user believed** — the material for judging estimate accuracy.

**Decision:** estimate judgements belong to checkpoints alone. `ESTIMATE_CHANGED` (schema in `event.service.ts`, emitted from `task.service.ts`, wired in #51) is **removed**. It put a judgement in the ledger, which gave estimates two homes and no rule for which wins — and they are guaranteed to disagree, because checkpoints are debounced (ADR-0022) and the ledger is not.

`STARTED` (event: work began) and the baseline checkpoint (belief: this was the plan) firing at the same instant is not duplication. Different questions, different records.

## Why an estimate is not "what happened"

The line is not "state vs history" — both records are historical. It is **fact vs belief**. `COMPLETED` is a fact: it happened, it is not revisable, and its truth does not depend on who wrote it. An estimate is a claim about the future that its author may be wrong about — and being wrong about it *is the product*. Facts go in the ledger; claims go in checkpoints where accuracy analysis (#26) can grade them.

## Every task can hold a checkpoint

Required by this ADR, not incidental. A leaf task gets a `Checkpoint` row with **zero `CheckpointTask` rows** and `ownEstimate` set — a cross-section with no columns. Without this, a standalone root task with no children has no parent checkpoint to appear in and no checkpoint of its own, so its estimate judgements would have no home once `ESTIMATE_CHANGED` is gone. `CheckpointTask` rows are the *columns* — one per direct child (invariant 3), never grandchildren.

## Considered options

**Keep `ESTIMATE_CHANGED` and write an authority rule** ("the ledger owns what changed, the checkpoint owns what the plan was"). Rejected: it buys fine-grained estimate history at the price of two sources of truth about the same fact, forever, plus a rule every future reader must know before touching either. The split above needs no such rule — the seam does the work.

## Consequences

- **The intra-burst wobble is lost, deliberately.** Estimate moves inside one debounce window (2h → 3h → 2.5h before settling) are recorded nowhere. A half-formed judgement is not a judgement (ADR-0022). This is one-way: if that fiddling is ever wanted, it was never written down.
- Anything asking "how did this estimate move?" reads checkpoints, never events. A future `ESTIMATE_CHANGED`-shaped event type is this ADR being reversed, not extended.
- `CheckpointTask` must carry `title` — a checkpoint is read years later and must stand alone. Joining to `Task` gives the title *now*, and gives nothing for a task since deleted.
