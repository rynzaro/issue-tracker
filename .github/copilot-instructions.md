# Copilot Instructions

Global defaults for every Copilot interaction in this workspace.
Active regardless of skill mode (FAST or LEARN).

---

## Spec Summary TOC

| Doc                              | Answers the question               | Key contents                                                                                                               |
| -------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `docs/AGENT.md`                  | "What are the architecture rules?" | Service layer flow, server action pattern, event/checkpoint rules, schema reference, iteration status, critical invariants |
| `docs/ARCHITECTURE_DECISIONS.md` | "Why was X decided this way?"      | Chronological AD log (AD-2 – AD-17), rejected alternatives, open future questions                                          |
| `docs/ROADMAP.md`                | "What's done and what's next?"     | Iteration checklists (0–6), completion status per item                                                                     |
| `docs/DEVELOPER.md`              | "How do I run this?"               | Dev setup, commands, environment variables                                                                                 |
| `docs/USER.md`                   | "What does the product do?"        | User-facing feature descriptions                                                                                           |
| `TODO.md`                        | "What's broken or pending?"        | Open issues from code reviews, categorized by severity                                                                     |

**Rule:** Read `docs/AGENT.md` before making any code change. Check the Iteration Status table to know which rules are active.

---

## Deliberate Before Acting

Before non-trivial reasoning, pause and think step-by-step (use Sequential Thinking MCP if available, otherwise structure your reasoning explicitly):

- Planning a multi-step task
- Evaluating tradeoffs between approaches
- Debugging a non-obvious issue
- Reviewing code for correctness

Do NOT skip this for speed. The thinking step catches errors that cost more time downstream.

---

## Clarify Ambiguity

If the request could be implemented in multiple meaningfully different ways:

1. Identify the specific ambiguity
2. Ask 2–4 targeted questions (specific, answerable — not open-ended)
3. Wait for answers before proceeding

Do NOT guess when the implementation path is unclear.
Do NOT ask permission when the path is clear.

---

## Three-Tier Boundaries

### Always Do

- Read `docs/AGENT.md` before changes
- Verify `auth()` session in every server action
- Validate input with Zod in every mutation
- Filter `deletedAt IS NULL` in every query
- Follow `Component → Server Action → Service → Prisma` flow
- Check existing files for patterns before writing new code
- Use German for UI-facing strings

### Ask First

- Schema changes (`prisma/schema.prisma`)
- New dependencies (`package.json`)
- New patterns not in `ARCHITECTURE_DECISIONS.md`
- Auth flow or middleware changes
- Deleting or renaming existing files
- Changes touching more than 3 files

### Never

- Business logic in components or API routes
- Skip auth checks in server actions
- DB-level cascade deletes (AD-11)
- Import from `lib/toggl/` outside the Toggl feature
- Secrets or API tokens in `.env` / `process.env`
- Remove a failing test without explicit approval
- Rubber-stamp a review

---

## Code Style

### Server Action skeleton

```typescript
"use server";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function xAction(params) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const validated = XSchema.safeParse(params);
  if (!validated.success)
    return { success: false, error: validated.error.flatten() };
  const result = await xService(validated.data);
  revalidatePath("/s/...");
  return { success: true, data: result };
}
```

### Service skeleton

```typescript
export async function xService(params: ValidatedParams) {
  const result = await prisma.x.update({ where: { ..., deletedAt: null }, data: { ... } });
  await emitEvent(result.id, "EVENT_TYPE", { ... });
  return result;
}
```

---

## Session Management

When starting a session:

1. Check `.chat/` for the latest `session-handoff-*.md`
2. Read it for prior work, decisions, and pending items
3. Continue from where the previous session left off

When ending a session: use the `session-handoff` skill.

---

## Skill Recognition

While working, watch for patterns that should become reusable skills. Something is skill-worthy when:

1. **Recurring judgment** — the same non-obvious decision or reasoning process appears for the 2nd+ time across sessions
2. **Undocumented convention** — "how we do things" that isn't captured in any existing skill, AGENT.md, or ARCHITECTURE_DECISIONS.md
3. **Repeatable workflow** — a multi-step process the user describes as "whenever I do X, I always need to Y then Z"
4. **Fragile expertise** — knowledge that would need to be re-discovered if this session's context disappeared

**Threshold:** Suggest only when (a) the pattern has appeared at least twice AND (b) no existing skill already covers it. Do not suggest on every vague pattern.

**When you spot one, suggest briefly:**
> "This looks like reusable expertise — [one-line description]. Want to package it as a skill? You can invoke `@skill-creator`."

Then continue with the current task. Do not derail the workflow.

---

## Tech Stack

Next.js 16 App Router · React 19 · TypeScript · Prisma 7 · MariaDB · NextAuth 5 · Tailwind CSS 4 · HeadlessUI · Zod · Vitest
