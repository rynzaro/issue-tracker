# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

## Commitment labels

Two labels say how decided a piece of work is:

- `backlog` — accepted, not scheduled. We want this, someday.
- `idea` — not decided. Explore first (research / prototype / grill); build maybe never. Never milestoned. The issue body must have a **Warnings** section: the decisions elsewhere that would hurt or kill the idea. After exploring: promote to `backlog`, or close as `wontfix` and write down what we learned.
