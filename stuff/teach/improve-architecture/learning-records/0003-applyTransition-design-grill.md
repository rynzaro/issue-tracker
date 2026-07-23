# 0003 — applyTransition design grill

Date: 2026-07-14 · Lesson 3 (no HTML lesson — live design + grill) · Result: issue #57

## What was learned

- Closed the Lesson 2 homework himself: getRestoreCheck (client, any
  archived ancestor blocks) vs validateUndelete (server, deletion gap
  only) — recognized both encode one domain rule with no shared home.
  Rejected "store archivedAt on deleted children eagerly" on his own
  once mirrored against his activeDescendantStartedAt lesson: derive
  at need-time, don't store.
- Design under fire: started with a two-bucket "upward vs downward"
  model; the real code (ancestors fetched for ALL six kinds,
  descendants for three) broke it; rebuilt it as per-kind stop states.
- **The generalization was his**: COMPLETE stops at {archive, delete},
  ARCHIVE at {delete}, DELETE at {} → one total order
  `delete > archive > complete`. Verified it also drives the backward
  family (inherit strictly-weaker from ancestors, backdated) and makes
  illegal moves (uncomplete through archive) fall out for free.
- Stored fact vs audit trail: backdated completedAt on the row, event
  at `now` — clean separation, his call.
- Dependency direction: policy importing ServiceErrorResponse from
  serviceUtil = domain speaking the service's language; flipped it
  (policy owns error type, service adapts). Followed through unprompted:
  "then taskHierarchyPolicy shouldn't live in lib/services" →
  lib/domain/ convention born.

## Grill quality notes

- He asked "are you probing my knowledge or asking for a decision?" —
  mark decisions vs quiz questions explicitly. When unpacked into
  plain-language situation → problem → decision + recommendation, he
  answered fast and well.
- "Challenge this" is his invitation to attack a scenario he built —
  he uses the grill actively, not defensively.
- Found real bug during grill (#56, timer on archived task) by testing
  his "no timer possible in archived subtree" claim against code.

## Drives next

- He implements #57 (first slice: pure policy, order-driven config,
  lib/domain move). Agent reviews only.
- Spaced retrieval check afterwards (mission step 4): depth/deletion
  test, seams/leakage, and now the strength-order design.
