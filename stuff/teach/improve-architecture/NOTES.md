# Notes

## Teaching preferences (from project memory + CLAUDE.md)

- Non-native English speaker. Plain, self-explaining words. No idioms, no jargon
  without definition on first use. ("tripwire" was rejected once.)
- Extremely concise style in chat. Lessons can breathe more, but stay simple.
- Dislikes canned multiple-choice option pickers in chat — ask free-form.
  (In-lesson HTML quizzes are fine; that's the lesson format.)
- Visual when structure beats prose — he likes diagrams/artifacts.
- Skills invoked only when named or squarely fitting.

## RESUME HERE (updated 2026-07-14)

activeDescendantStartedAt implementation DONE by Felix on branch
`active-descendant-date`: schema field, tree derivation (deepest wins),
tasks.tsx reads `activeTimerStartedAt ?? activeDescendantStartedAt`
(own timer wins — he initially dropped the own-timer case, caught via
Socratic question), util.ts fully domain-free again. tsc clean; only
the 3 pre-existing test failures remain. Good teach moment landed:
"generic module importing a domain type = logic in wrong place."
NOTE: project uses pnpm, not npm.
SHIPPED 2026-07-14: PR #48 (his impl) + PR #49 (order flipped to
self-first/shallowest wins — his call, reasoning: with future task
sharing a sharee sees only the subtree, so root's own timer must win).
Both merged to main-vibe; branches deleted; he's back on main-vibe.
Next: Lesson 2 homework probe still open (getRestoreCheck vs
validateUndelete — who owns restore legality, do they agree; answer =
finding 2 in reference/architecture-review-20260710-185006.html).
Then: Lesson 3 — he designs applyTransition, I grill (can be demanding,
see learning record 0002).

## Working notes

- 2026-07-13: workspace bootstrapped without mission answers (user re-ran /teach
  silently). MISSION.md is a draft — get confirmation next contact.
- Vocabulary must match `.claude/skills/codebase-design/SKILL.md` exactly:
  module, interface, implementation, depth, seam, adapter, leverage, locality.
  Avoid: component, service, API, boundary, unit.
- His own codebase is the practice ground. Every lesson should point at real
  OnTrack files (task.service.ts, taskHierarchyPolicy.ts, project.service.ts).
- Two architecture reviews rescued into ./reference/ (temp dir gets purged).
- 2026-07-13: he wants to IMPLEMENT refactors himself (reverted my PR #47 at
  his request). Default: he codes, I guide/review. Don't grab the keyboard
  on practice work unless he explicitly hands it over.
- 2026-07-13: Feathers' compressed seam definition ("change behaviour without
  editing there") confused him. Unpack dense definitions with a code line +
  the can-I-change-this-from-outside question. Prefer concrete before abstract.
