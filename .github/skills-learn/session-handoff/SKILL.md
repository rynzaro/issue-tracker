---
name: session-handoff
description: "Trigger when the context window is getting long, the user is ending a session, or the user asks for a handoff summary."
---

# Session Handoff Skill

## Purpose

Produce a structured handoff that lets a new session resume without re-reading the entire codebase. Format matches the proven structure used in existing `.chat/session-handoff-*.md` files.

---

## When to Trigger

- User says "handoff", "end session", "wrap up", "save progress"
- Context window is getting long (many exchanges)
- User is switching tasks or stepping away

---

## Behavior

### Step 1 — Gather State

Collect from the current session:

- What was the active work? (branch, staged/unstaged)
- What decisions were made? (numbered, with rationale)
- What files were changed? (file-by-file, nature of change)
- What's pending or blocked?

### Step 2 — Write Handoff

Create `.chat/session-handoff-YYYY-MM-DD[-label].md` using this structure:

```markdown
## Session Handoff — YYYY-MM-DD

### Active Work

What was being worked on. Branch name. Staged/unstaged state.

### Decisions Made This Session

Numbered list. Each entry: what was decided and why.

### Changes Applied

File-by-file list. For each: file path + brief description of what changed.

### Pending / Blocked

Numbered list. Each entry: description, file/line if applicable, suggested fix or next step.

### Key Context

Include ONLY areas that changed this session or matter for continuation:

- Commands: any new build/test/lint commands discovered
- Testing: test status, new test patterns established
- Project Structure: new files/directories created
- Code Style: new patterns established this session
- Git Workflow: branch state, commits made
- Boundaries: new constraints discovered or rules clarified

Omit areas where nothing changed.

### Continuation Plan

Numbered steps for the next session. Dependency-ordered.

### Files to Read First

Ordered list of files the next session should read for fastest context ramp-up.
```

### Step 3 — Completeness Check

Verify against this concrete checklist:

- [ ] Branch name included?
- [ ] All file changes listed with nature of change?
- [ ] Open issues numbered with file/line references?
- [ ] Continuation plan has ordered steps?
- [ ] Files-to-read list starts with the most important file?
- [ ] No decision from this session is missing from the Decisions section?

If any item fails, fill the gap before finishing.
