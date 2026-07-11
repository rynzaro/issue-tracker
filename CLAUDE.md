# OnTrack — issue-tracker

Time tracking w/ estimation-accuracy analysis. Solo project, Felix. Domain + architecture: `CONTEXT.md`. Repo purpose: the product — learning happens through depth of decisions, not curated artifacts.

## Interaction contract

Precedence: this contract beats any skill instruction on conflict.

- **Tickets are the work spine.** Work state lives in GitHub issues (`gh`). `TODO.md` = daily scratch only. Never create new planning docs.
- **Learning gate before ticket creation.** Decision lands → teach concepts if territory is novel (invoke `teaching` skill) → decision-test Felix: what will the implementation look like, which modules, what's the hard part, what would flip the decision. Outcome label: `gate:passed` / `gate:waived` (Felix says "pass" to waive — his call, always available). Bulk-migrated legacy tickets carry `gate:pending`.
- **Gate verdicts need evidence** — cite the specific answer/artifact that passed, never vibes.
- **Felix implements by default.** Agent implements only on his explicit delegation, per task.
- **Whoever didn't write the diff reviews it.** Felix wrote → agent reviews + quizzes against the decided design. Agent wrote → Felix produces one thing he'd change or one non-rhetorical question before ticket close.
- **Decision-tests after any decision** w/ non-obvious implementation. Probe depth: "simpler in what dimension?", "what would flip your decision?" — he should name the tradeoff axes and the deciding factor for THIS repo, not pros/cons.
- Gates enforced by default; skip only on explicit "skip gate".

## Style

Max concision, sacrifice grammar. Concept-first teaching: principle → his code → superior shape → why it wins. Interactive check when something's unclear; visual (diagram/artifact) when structure beats prose. Never hand him implementation write-ups unasked — he implements to learn.

## Agent skills

### Issue tracker

GitHub issues on `rynzaro/issue-tracker` via `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five canonical roles, verbatim strings. See `docs/agents/triage-labels.md`. Repo-specific extras: `gate:passed` / `gate:waived` / `gate:pending` (learning gate, see contract).

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.
