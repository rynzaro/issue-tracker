# Authorization Policy — Implementation Plan & Design Record

**Status: design complete, implementation deliberately deferred (2026-07-11).**
Implementing now is premature — every rule below collapses to "the one user may do everything" while projects are single-player, so the module would solve no live problem. **Trigger to implement:** the start of multiplayer work (#38, `docs/FUTURE_COLLABORATION.md` Phase 1). Ticket: #22. Decision record: ADR-0019 (+ addendum). Vocabulary: `CONTEXT.md`.

Source: grilling session 2026-07-11 (ADR-0019 checklist walked branch-by-branch; gates verified against code as of commit `918d1a3`).

---

## 1. Decided authority model

Three authority roots, not one "ownership". Rationale: **time entries are estimation evidence** — a person judges only their own ability to estimate, so nobody executes another's task.

| Root | Field | Who | Acts |
|---|---|---|---|
| **Structural** | `project.userId` | Project Owner | project update/delete; task create/update/delete/complete/uncomplete/archive/unarchive/restore; reading a task's time entries; `hasActiveDescendants` |
| **Execution** | `task.createdById` | Task Creator, **exclusive** — even the Project Owner is denied | timer start; manual time-entry create |
| **Entry author** | `entry.userId` | whoever logged it | time-entry update/delete |

Deliberate sub-decisions:

- **Owner reads everything** (time entries included) — flagged *rollback-able*: a future privacy mode is a one-cell change in the rule table.
- **Entry mutation is author-only** — the owner may read your evidence, not rewrite it.
- **Completion stays structural for now** — whether a task member may complete/uncomplete their own subtask is a team-mode cell, deferred (see §6; it is genuinely dangerous to grant naively).
- `createdById` is **not** a stopgap and **not** pure attribution: it is the execution-authority root *by design*. The `// TODO: Replace with project membership/role check` comment in `activeTask.service.ts` is wrong and should be replaced (not honored) during implementation. ADR-0012's "planner/distributor independently of assignees" wording needs softening then too (#19 dissolves into task membership — no assignee concept, see §7).

## 2. Error semantics

- `assertCan` masks unauthorized as `NOT_FOUND`.
- **This is a behavior change, not preservation.** ADR-0019's original claim ("preserving the current non-leaking behavior") was false: all services load-then-check and return `AUTHORIZATION_ERROR`, which leaks resource existence to any logged-in prober. 10 test-file lines codify the leak — 5 actual assertions (4 in `timeEntry.service.test.ts`, 1 in `activeTask.service.test.ts`) plus 5 matching test titles — update them deliberately during migration; the checklist's "existing tests stay green" holds only modulo these.
- Post-migration, `AUTHORIZATION_ERROR` is emitted **only** by actions, where it means "not signed in". Renaming it `UNAUTHENTICATED` (and dropping the old code from the enum) is bundled with the deferred `withAuth` wrapper — both touch all 21 actions, do them together.

## 3. Module shape (`lib/authz/policy.ts`)

- `Principal = { userId: string }` (later: + role / grants).
- **Per-operation `Act` union** (~14 acts): `"project:update" | "project:delete" | "task:create" | "task:update" | "task:delete" | "task:complete" | "task:uncomplete" | "task:archive" | "task:unarchive" | "task:restore" | "task:read" | "timer:start" | "timeEntry:read" | "timeEntry:create" | "timeEntry:update" | "timeEntry:delete"`. Chosen over per-family acts so single cells (visibility, completion) can change later without touching call sites; the rule table groups acts under the three roots so the families stay visible.
- Resources are **minimal structural projections** typed via an `Act → resource` map (e.g. `task:archive` → `{ project: { userId: string } }`, `timer:start` → `{ createdById: string }`). Pure, sync, no Prisma imports, no I/O — services load, policy judges.
- `can(principal, act, resource): boolean`; `assertCan(...): ServiceErrorResponse | null` (NOT_FOUND-masked).
- **TDD**: write `tests/unit/authz/policy.test.ts` first — the module is pure, tests need no DB.

## 4. Placement rules

- **Resource-dependent checks**: in services, `load → assertCan → act`, replacing each scattered ownership `if` at the same position.
- **Collections & self-scoped ops** (`getProjectsByUser`, `getProjectTaskTree`, active-timer ops keyed on `userId`, …): stay authorized by query scoping (`where userId`) — no policy call. Loading everything to filter through `can()` would be absurd.
- **Resource-free checks** (session exists; `createProject`): stay at the entry point.
- **Invariant: authorization strictly precedes transition-legality validation.** With masking, legality errors (gap checks etc.) are only ever visible to authorized principals.

## 5. Migration checklist (execute at trigger time)

1. `lib/authz/policy.ts` + pure unit tests (TDD, no DB).
2. Migrate service by service, suite green after each (modulo §2's deliberate assertion updates and the 3 pre-existing failures in #12): `project.service.ts` → `task.service.ts` → `timeEntry.service.ts` → `activeTask.service.ts`. 19 scattered checks + 1 missing one (next line).
3. `hasActiveDescendants` (`task.service.ts:314`) currently checks **nothing** — no `userId` param; any logged-in user can probe a task ID for existence + running-timer state. Give it the structural `task:read` check. (Same "harmless while single-player" logic as the rest — that's why it waits here rather than being hotfixed.)
4. Delete `getProjectById` (exported, zero callers, unscoped — confused-deputy shaped) and update the two examples that reference it: the `unwrap()` docstring in `serviceUtil.ts` and the usage snippet in `README.md`.
5. Replace the `activeTask.service.ts` TODO comment (see §1).
6. Amend ADR-0017's consequences note: a service touching an owned resource without `assertCan` becomes a review finding, not a design feature. While there, fix ADR-0017's stale example showing `getProjectById(projectId, userId)` — the real function takes only `projectId` and no ownership check.
7. Out of scope, do separately afterwards: `withAuth` action wrapper + `UNAUTHENTICATED` rename (one bundled change across the 21 actions).

## 6. Why the gates survive (verified against code, 2026-07-11)

Every hierarchy transition has the identical five-stage shape — verified in delete/complete/unarchive/restore, archive matches:

```
load (state-filtered where) → NOT_FOUND → [ownership if]   ← the ONLY line the migration touches
→ tx { getAllAncestors → validateTransition → timer guard → buildTransitionPlan → executePlan }
```

| Gate | Location | Fate under migration |
|---|---|---|
| Ancestor legality + 3 gap checks | `taskHierarchyPolicy.ts` | diff never opens the file |
| Active-timer guards (delete/complete/archive block over a running timer) | separate statements inside the tx | untouched |
| State filters (`deletedAt: null`, …) | the load's `where` | untouched |
| Parent-state guard in `createTask` | `where` clause | untouched |
| Cascade plans (down: complete/archive/delete; **up**: uncomplete/unarchive/undelete repair contiguous ancestor chains) | `buildTransitionPlan`/`executePlan` | untouched |

Regression net: `taskHierarchyPolicy.test.ts` passes byte-identical; in service tests only ownership-error codes change. In team mode the timer guards become the **boundary contract between the authority families** — a structural act (owner archives) cannot bulldoze a running execution (member's timer).

## 7. Team-mode design notes (the expensive-to-rediscover part)

**Felix's vision (2026-07-11):** project owner creates tasks; people can be **added to a task** (task membership). Task members cannot edit the task; they **create sub-tasks under it, which they then execute** (their timers, their entries, their estimation evidence). No assignee concept — see conflict (2) below.

**The upward-cascade hazard.** Finish is subtree-local (`buildCompletePlan` cascades down only; a member's subtree is their own creation). Unfinish is **not**: `buildUncompletePlan`/`buildUnarchivePlan`/`buildUndeletePlan` repair the *contiguous transitioned prefix of ancestors* — reopening a member's subtask can force the owner's completed parent back open. Granting members "complete/uncomplete your own subtask" naively lets a lesser-authority principal mutate owner tasks upward.

**The resolution (sketched, not implemented): write-set authorization.** *A transition is permitted iff the principal may transition every node the plan touches.* Not "the target", not "all ancestors" — exactly the plan's ids, which `buildTransitionPlan` already computes and returns (`plan.setCompletedAt.ids`, …), with ancestors already loaded in the same tx. Implementation shape: target-level `assertCan` up front (cheap, masks existence), then a post-plan loop over the write-set before `executePlan`. The resulting finish-but-not-unfinish asymmetry is **intended**: it's the two families meeting at the completion boundary.

**Bounded cascades are forbidden.** The tempting alternative — stop the upward repair at the edge of the member's authority — manufactures exactly the ancestor-chain gap that invariant #5 (`CONTEXT.md`) and the whole hierarchy policy exist to prevent. All-or-nothing is the only coherent semantics.

**Glossary evolution note:** `CONTEXT.md`'s "Authorization … judged once, on the target" is accurate while transitions are owner-only. Under task sharing it becomes "judged over the write-set" — update the entry then, not before.

**Conflicts with `docs/FUTURE_COLLABORATION.md` to resolve when multiplayer starts (also listed on #38):**

1. Phase 1 step 3 says membership replaces `project.userId` for authorization ("project membership = task access"). Under the decided model that holds for the **structural/visibility** family only; execution stays creator-exclusive.
2. Phase 2 proposes `Task.assigneeId` = "who is responsible for executing it". Incompatible with creator-exclusive execution and with the task-membership vision. One of the two visions must win; #19 (assigneeId mismatch) should be resolved together with this.
3. Phase 1's Scoped Repository prerequisite and this policy module are **complementary, not competing**: scoped repos = data isolation (which rows are visible), policy module = authorization (which acts are permitted). Sequence them explicitly when planning Phase 1.
