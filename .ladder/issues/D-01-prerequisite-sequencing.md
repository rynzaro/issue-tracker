# D-01 — Prerequisite sequencing: does Task Membership require the deferred central authz policy + scoped repos first?

**Status:** RESOLVED 2026-07-19 — Option C

## Context

The central authorization policy (`lib/authz/policy.ts`, ADR-0019) and the Scoped
Repository pattern (FUTURE_COLLABORATION Phase 1 prerequisite) are **deliberately
deferred** until multiplayer (AUTHORIZATION_PLAN.md: "Trigger to implement: the
start of multiplayer work"). Task Membership is the first multiplayer-shaped
feature. So this decision gates everything: it decides whether the foundation
lands first or whether Task Membership is a narrow enough slice to ship on
today's scattered 14 `!== userId` checks.

Facts that shape it:
- Today's authority checks are 14 scattered sites in services, two definitions
  of ownership (`project.userId` vs `task.createdById`) — they coincide in solo
  mode but ADR-0012 redefines `createdById` as "planner" in team mode (ADR-0019
  context: "one of the two is a latent bug").
- AUTHORIZATION_PLAN §1 says `createdById` is the execution-authority root *by
  design*, and the `// TODO: Replace with project membership/role check` comment
  in `activeTask.service.ts:49` is **wrong and should be replaced, not honored**.
- Task Membership adds a second actor who is *not* the project owner and *not*
  the host-task creator. Every one of today's `!== userId` checks becomes a
  confused-deputy or wrong-root bug the moment that actor exists. There is no
  path through today's checks that correctly admits "member may add children to
  this task but not edit it."

## Decision

Does Task Membership require (a) the central `lib/authz/policy.ts` module
(ADR-0019) and (b) the Scoped Repository layer to land **before** any Task
Membership feature work — or is Task Membership narrow enough to ship on
hand-extended checks and defer both?

## Options

- **A. Foundation first.** Land ADR-0019 policy module + scoped repos as the
  first multiplayer slice; Task Membership is the *first consumer* of the new
  `can()`/`assertCan` and scoped queries. Matches AUTHORIZATION_PLAN's stated
  trigger. Costs: the full migration checklist (§5) before any feature value.
  Benefit: no hand-extended checks to later rip out; the write-set rule (D-06)
  and visibility (D-03) have a home.
- **B. Task Membership first, foundation deferred.** Hand-extend the few
  checks a Task Member touches (add-child on host, execute own subtasks) on
  today's scattered pattern; defer the policy module. Cheaper entry; but every
  extended check is a throwaway the migration later deletes, and the
  two-definitions-of-ownership latent bug (ADR-0019) is live under a second
  actor — high risk of shipping a confused-deputy.
- **C. Policy module first, scoped repos deferred.** Land `lib/authz/policy.ts`
  only (it's pure, TDD, no DB — cheap per AUTHORIZATION_PLAN §3/§5 step 1-2);
  keep manual `where userId/projectId` scoping for now. Gets the authority
  roots right and kills the latent bug, skips the heavier repository-pattern
  decision (which FUTURE_COLLABORATION itself defers past MVP). Scoped repos
  land later if/when the manual scoping actually hurts.

## Blocking edges

- **Blocks:** D-03 (visibility — needs scoped repos or policy), D-06 (write-set
  authorization — needs `assertCan` over plan ids), and the whole build.
- **Blocked by:** none — most upstream.

## Resolution (2026-07-19)

**Option C.** Land `lib/authz/policy.ts` (ADR-0019) first — pure, TDD, no DB
(AUTHORIZATION_PLAN §5 steps 1–2). Centralizing the scattered ownership checks
is **non-negotiable foundation for multiplayer**: under a second actor today's
two-definitions-of-ownership (`project.userId` vs `task.createdById`) is a live
bug, and the write-set rule (D-06) needs `assertCan`. Scoped repos are **not**
required to ship Task Member and stay deferred (FUTURE_COLLABORATION itself
defers them past MVP); manual `where userId/projectId` scoping stays for now,
revisited only if it hurts.

Migration sequence per AUTHORIZATION_PLAN §5: policy module + unit tests →
migrate `project.service.ts` → `task.service.ts` → `timeEntry.service.ts` →
`activeTask.service.ts` → delete `getProjectById` → replace the
`activeTask.service.ts:49` TODO (delete, don't honor) → amend ADR-0017.
`withAuth` wrapper + `UNAUTHENTICATED` rename: separate, afterwards.