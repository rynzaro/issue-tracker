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
2026-07-14 session 2: Lesson 2 homework CLOSED — he found the drift
himself, derived restoreLegality-as-derived-state (echoing his
activeDescendantStartedAt move: derive, don't store). Lesson 3 grill
DONE: applyTransition design settled, full spec in issue #57. His key
find: one strength order delete > archive > complete runs both
transition families (forward cascade stop rule + backward inherit
rule) — his own generalization from three per-kind lists.
Side find: bug #56 (timer can start on archived task), filed.
Next: HE IMPLEMENTS #57 (blocked by #56 — small fix, good warm-up).
Suggested first slice: pure policy changes (order-driven config + own
error type + move to lib/domain/), tests through validateTransition/
buildTransitionPlan only. Agent reviews, does not write practice code.
Then: spaced retrieval check (mission step 4).

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
