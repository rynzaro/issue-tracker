# Mission

## Why

Felix runs `/improve-codebase-architecture` on OnTrack and gets ranked deepening
opportunities — but the tool sees the problems, not him. He wants the eye and the
vocabulary to spot shallow modules, seam leakage, and lost locality *himself*, before
a review does, and to design deep module interfaces with confidence.

## Concrete goal

Refactor OnTrack's known friction points (six copy-pasted task transitions,
duplicated task-tree assembly, leaking server→client seam) while *understanding*
each move — so the next design decision doesn't need a review tool.

## Success looks like

- Can apply the deletion test, "interface is the test surface", and the
  one-adapter/two-adapter rule to real OnTrack code without prompting.
- Can explain, for a given refactor, what callers gain (leverage) and what
  maintainers gain (locality).
- Designs the `applyTransition` deepening himself and can defend the interface.

## Grounding material

- `reference/architecture-review-20260710-185006.html` and `-201757.html`
  (rescued from temp) — the two reviews of this repo, 2026-07-10.
- Vocabulary source of truth: `.claude/skills/codebase-design/SKILL.md`.

## Status

Drafted by agent 2026-07-13 from workspace name + review artifacts.
Confirmed by Felix 2026-07-13, incl. 4-step plan (seams lesson → interface
design lesson → real applyTransition refactor → spaced retrieval check).
