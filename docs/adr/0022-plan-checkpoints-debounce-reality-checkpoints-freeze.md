# Plan checkpoints debounce, reality checkpoints freeze

Grilled 2026-07-17 (`/grill-with-docs`, #24). A checkpoint records a **settled** judgement, not a change. Adding a sub-task with an estimate is a judgement, but a partial one — you are mid-thought. Add four more, tweak two estimates, stop: *now* there is a plan worth freezing and worth being graded against later. One thought, not five keystrokes.

**Decision:** checkpoints split into two families with different write rules.

| | **Plan checkpoint** | **Reality checkpoint** |
|---|---|---|
| Triggers | `SCOPE_CHANGE`, `ESTIMATE_CHANGE`, `MANUAL` | `WORK_STARTED` (baseline), `TASK_COMPLETED` |
| Authored by | the user | the world |
| Records | what was decided | what was still believed when facts landed |
| Write rule | **replace in place** while the window is open | **freeze on write**, never replaced |

## Debounce is the definition, not an optimisation

The retired roadmap justified the window as noise reduction — "adding 5 sub-tasks shouldn't make 5 rows." That is a performance argument and it is the wrong one. The window is **how the app detects that thinking finished**. Keeping the intermediate states would mean grading the user on sentences they had not finished writing.

Hence *destructive replace* (the open question in #24): inside the window there is exactly **one** checkpoint, overwritten until the judgement settles. Not append.

**The window closes on the earlier of: 30 minutes idle, or `WORK_STARTED`.** A timer alone is a weak proxy for "I stopped thinking" and has a real failure: plan for 3 minutes, start work, keep editing for 25 — the window is still open, so the baseline gets overwritten by edits made *after* work began. Starting a timer is the strongest available signal that planning ended. It makes the baseline exact by construction instead of by luck.

## Why reality checkpoints must not debounce

Complete task A at 14:00 (50% over its estimate), react at 14:05 by raising sibling B to 3h. Under one shared window the reaction **overwrites** the moment reality landed — destroying the exact signal the checkpoint existed to catch.

That signal is **silence**. If A finishes 50% over and B and C sit untouched, the checkpoint records a *failure to update*: evidence arrived and the plan did not move. Not acting emits no event, so no ledger replay can find it (ADR-0021). Only a frozen cross-section catches an omission.

## Why `TASK_COMPLETED` stays

It looks like an outcome — derivable from `completedAt` plus TimeEntry rows, and outcomes are the answer key, not a guess. The reason it stays: at the moment A completes, the interesting snapshot is not A. It is **B and C**. Completion is when a task's actual time stops being provisional, and a frozen cross-section is the only record of what was still believed about the rest of the plan at that instant.

## Consequences

- Two write paths in `checkpoint.service.ts`, not one. A trigger that picks the wrong family is a silent data bug: a debounced baseline loses the plan, a frozen plan-checkpoint litters history with half-thoughts.
- `WORK_STARTED` both **closes** the plan window and **writes** the baseline. Order matters: settle the open plan checkpoint first, then freeze the baseline.
- Long-horizon plans are underserved. Baseline + completion on a year-long task means the first sharpening signal arrives in a year. An **estimate-exceeded** trigger (tracked crosses estimate while work continues) would catch drift mid-flight — deliberately left open, to be decided once #26 has produced real numbers.
