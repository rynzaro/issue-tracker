# D-07 — Task Member's structural authority on the host task

**Status:** open (downstream)

## Context

CONTEXT.md glossary: a Task Member "may create sub-tasks under it; may not edit
or execute the task itself." So the member holds a **narrow structural act** on
the host — `task:create-child` (a new act not in today's ~14, AUTHORIZATION_PLAN
§3) — and nothing else: not `task:update`, not `task:complete`, not
`task:archive/delete`, not `timer:start` on the host.

The subtlety: "create a subtask under it" is today a `createTask` with
`parentId = host`. Today `createTask` checks only `project.userId === me`
(task.service.ts:335) — the project-owner gate. A Task Member is not the
project owner, so today's check denies them outright. The new act
`task:create-child` must be grantable by *host ownership or host membership*,
not by project ownership alone — a new authority path the policy module (D-01)
must express.

Also: a subtask the member creates becomes *their* task — they hold full
structural + execution authority on their own subtree (they're its creator and
its project-owner-proxy via the host? or just creator?). Whether a member's
subtree is "in the project" for the project owner's read access is a visibility
question (D-03); the authority the member holds on their own subtree is here.

## Decision

Confirm the act set a Task Member holds on the host (`task:create-child` only)
and the act set they hold on their own created subtree (full structural +
execution). Is `task:create-child` a distinct act in the policy, or a
`task:create` scoped by "parent is a task you own-or-are-member-of"?

## Options

- **A. New distinct act `task:create-child`.** Policy rule: granted iff
  principal is project owner OR host-task owner OR host-task member. Host
  member gets *only* this act on the host; full authority on what they create.
  Keeps the act union explicit and auditable (matches AUTHORIZATION_PLAN §3's
  per-operation-act rationale: single cells changeable later).
- **B. Reuse `task:create` with a parent-authority predicate.** No new act;
  `task:create` checks "you may create under this parent" (owner/member).
  Fewer acts; but `task:create` at project-root and `task:create` under a
  member-host have different authority sources — collapses two rules into one
  and risks the two-definitions bug ADR-0019 warns about.
- **C. Membership grants a broader structural subset.** e.g. member may also
  edit the host's estimate. Reject: contradicts CONTEXT.md ("may not edit the
  task itself") and D-04's principle that the host's plan is the owner's.

## Blocking edges

- **Blocks:** D-05 (whether adding a child is the member's authored plan act),
  and the `createTask` rework for multiplayer.
- **Blocked by:** D-02 (membership anchor — "member of what" defines the
  grant source), D-01 (policy module to express the act).