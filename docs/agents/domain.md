# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

Layout: **single-context** — one `CONTEXT.md` at the repo root + `docs/adr/`.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root — glossary, architecture rules, invariants, current state.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (task status via datetime flags) — but worth reopening because…_

## Check idea warnings

Ideas (`gh issue list --label idea`) are not planned work, but each body has a **Warnings** section: decisions that would hurt or kill that idea.

Before a hard-to-reverse decision — schema migration, event shapes, anything ADR-worthy — read the Warnings of the open ideas. If your decision matches one, tell Felix before making it:

> _This hurts idea #39 (Toggl import): no source field on TimeEntry means imported entries can never be told apart. Decide anyway?_

Felix decides at the fork. Never quietly design an idea out; never secretly build for one either.
