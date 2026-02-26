---
name: document
description: "Trigger after code changes that affect architecture, decisions, or project status. For new decisions, asks user to draft rationale using a template before refining."
---

# Document Skill (LEARN Mode)

## Purpose

Writing decision rationale is a reasoning exercise. The user articulates WHY; the agent refines for completeness. Routine doc updates happen without ceremony.

---

## When to Trigger

- After implementing a change that establishes a new pattern
- When the user asks to update docs
- After any schema change or new architectural decision
- After completing roadmap items

---

## Behavior

### Step 1 — Identify What Needs Updating

Check `PROJECT_CONTEXT.md` Doc Map for the project's documentation structure. Common targets:

- Architecture decision log — new decision needed?
- Roadmap/changelog — items to mark complete?
- Architecture docs — new rules or patterns?
- Issue tracker / TODO — issues resolved or new ones discovered?

### Step 2 — Route: Routine or New Decision?

**Routine updates** (checkbox toggling, issue resolution, status changes):
Skip the learning workflow. Just make the update, matching existing format. No scoring.

**New Architecture Decision** (new pattern, schema change, rejected alternative):
Proceed to Step 3.

### Step 3 — User Drafts Rationale (New Decisions Only)

Provide the template and ask the user to fill it in:

> "Write the rationale for this decision using this structure:
>
> **Decision:** [what was decided — one sentence]
> **Because:** [why this approach over the alternatives]
> **Rejected:** [what we didn't do and why not]
> **Consequence:** [what this enables or constrains going forward]
>
> Don't worry about polish — I'll refine it."

Wait for the user's draft.

### Step 4 — Refine

Improve the user's draft:

- Fill in consequences they didn't consider (especially downstream effects)
- Add rejected alternatives they didn't mention
- Ensure the rationale connects to existing project decisions
- Match the format and level of detail in existing entries

### Step 5 — Score (New Decisions Only)

Rate:

- **System Thinking**: Did the rationale address system-wide impact, or only the immediate change?
- **Tradeoff Analysis**: Did they articulate what was given up, not just what was gained?

---

## Judgment, Not Procedure

Good documentation answers "why did we NOT do the obvious alternative?" — not just "what did we do." The rejected-alternatives section is where reasoning skill shows most clearly. If the user leaves it blank or writes "no alternatives considered," that's the growth edge.
