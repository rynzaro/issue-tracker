---
name: session-handoff
description: "Trigger when the context window is getting long, the user is ending a session, or the user asks for a handoff summary."
---

# Session Handoff Skill

## Behavior

Gather session state and write to `.chat/session-handoff-YYYY-MM-DD[-label].md`:

```markdown
## Session Handoff — YYYY-MM-DD

### Active Work
What was being worked on. Branch name. Staged/unstaged state.

### Decisions Made This Session
Numbered list. Each: what was decided and why.

### Changes Applied
File-by-file list with nature of change.

### Pending / Blocked
Numbered list with file/line references and suggested next steps.

### Key Context
Only areas that CHANGED this session or matter for continuation:
- Commands, Testing, Project Structure, Code Style, Git Workflow, Boundaries
Omit unchanged areas.

### Continuation Plan
Numbered, dependency-ordered steps for next session.

### Files to Read First
Ordered list for fastest context ramp-up.
```

**Completeness check** before finishing:
- [ ] Branch name included?
- [ ] File changes listed with nature?
- [ ] Open issues numbered with file/line?
- [ ] Continuation plan ordered?
- [ ] No decision from this session missing?
