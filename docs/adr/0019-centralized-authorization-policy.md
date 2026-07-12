---
status: accepted 2026-07-02 — implementation deliberately deferred 2026-07-11 until multiplayer (premature while single-player; plan: docs/AUTHORIZATION_PLAN.md, tickets #22/#38); extends and partially retires ADR-0017
---

# Centralized authorization policy at service boundaries

**Context:** ADR-0017 made authorization the action layer's job and let services assume a pre-authorized caller ("services compose freely without re-checking auth"). A review of that property found it holds today only because the permission model is flat — one principal, binary ownership, no roles. Its known limitations:

- **Security by convention.** Nothing enforces that every action calls `auth()` or that services receive the session's `userId` rather than one derived from request input.
- **Confused-deputy exposure.** Unscoped internal helpers (e.g. `getProjectById(projectId)` — exported, currently uncalled, no ownership check) sit one name away from scoped ones; only the `getUser*` naming convention distinguishes them.
- **Inconsistent ownership definitions.** 19 scattered checks define ownership two ways: `project.userId` (task/project services) vs `task.createdById` (timeEntry/activeTask services). These coincide in solo mode, but ADR-0012 redefines `createdById` as "planner" in team mode — one of the two is a latent bug.
- **Breaks under team mode.** The moment permissions stop being flat (ADR-0012 planner/assignee, ADR-0014 dual-perspective tagging), a raw `userId: string` cannot express authority, and free composition allows a service authorized for the caller's role to reach an operation the caller shouldn't perform.

**Decision:** Hand-rolled centralized policy module — `lib/authz/policy.ts`. No external engine (CASL/Oso/OpenFGA are overkill for this matrix; the seam is the function signature, so an engine can be swapped in later without touching callers).

```typescript
type Principal = { userId: string };          // later: + role, projectGrants
type Act = "project:read" | "project:update" | "project:delete"
         | "task:complete" | "timeEntry:create" | /* ... */;

can(principal: Principal, act: Act, resource): boolean   // pure, sync, no I/O
assertCan(principal, act, resource): ServiceErrorResponse | null
```

Layering after this decision:

- **Action layer** — authentication only: `auth()` → `Principal`, zod validation, `revalidatePath`. Unchanged shape, thinner content (ad-hoc ownership logic leaves).
- **Service layer** — loads the resource, then `assertCan(principal, act, resource)` before acting. Authorization moves to the point of use so *every* path (action, server component, service→service composition) passes the check.
- **Policy module** — all "may" rules in one auditable file. Pure and synchronous: it judges already-loaded data, never queries — services load, policy decides.

Rules of placement: resource-free checks (session exists; future global role gates) stay at the entry point; resource-dependent checks live in services via the policy module.

**Error semantics:** `assertCan` masks unauthorized as `NOT_FOUND`, ~~preserving the current non-leaking behavior~~ ⚠️ *this claim is wrong — see addendum below* — no service can accidentally return a `FORBIDDEN` that leaks resource existence.

**Rationale:**

- One auditable place where policy lives, replacing 19 scattered `!==` checks with two definitions of ownership.
- Fixes the confused-deputy blind spot structurally: checks sit where the work happens, so composition cannot skip them.
- Forward-compatible: team mode extends `Principal` and the rule table; callers don't change.
- Pure `can()` is unit-testable in milliseconds with no DB.

**Consequences:** ADR-0017's "services assume a pre-authorized caller" is retired; services re-check at their boundary (defense in depth). The "compose freely without re-checking auth" property is deliberately given up — that property was a benefit purchased by the flat permission model, and this decision knowingly pays it back. ADR-0017's consequence note for reviewers inverts: absence of an `assertCan` call in a service that touches an owned resource becomes a review finding, not a design feature.

---

**Addendum (2026-07-11 grilling session):** The open ownership question is decided — three roots: structural (`project.userId`), execution (`task.createdById`, exclusive even against the project owner), entry author (`entry.userId`). Rationale: time entries are personal estimation evidence. One correction to the text above: the claim that `NOT_FOUND` masking "preserv[es] the current non-leaking behavior" is wrong — current services return `AUTHORIZATION_ERROR` after loading, which leaks existence; masking is a deliberate behavior change. Implementation is deferred until multiplayer; full plan, gate verification, and team-mode hazards: `docs/AUTHORIZATION_PLAN.md`.
