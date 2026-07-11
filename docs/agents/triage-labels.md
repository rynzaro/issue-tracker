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

## Repo-specific extras (not part of the canonical five)

| Label          | Meaning                                                          |
| -------------- | ---------------------------------------------------------------- |
| `gate:passed`  | Learning gate passed before ticket creation (evidence on ticket) |
| `gate:waived`  | Felix explicitly waived the gate ("pass")                        |
| `gate:pending` | Bulk-migrated legacy ticket — gate runs before implementation    |

`ready-for-human` is the default state for well-specified work: Felix implements by default (CLAUDE.md contract). `ready-for-agent` only after explicit delegation.
