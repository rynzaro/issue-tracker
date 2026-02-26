---
name: review
description: "Trigger when the user asks for a code review or after implementation. Structured review for correctness, architecture compliance, and edge cases."
---

# Review Skill (FAST Mode)

## Behavior

### Build Checklist from PROJECT_CONTEXT.md

Read the project's "Always Do" and "Never" rules to build a review checklist. Check these first (mandatory), then deep dive.

**Mandatory items** (derived from project boundaries):
- Auth/permission checks where required?
- Input validation on mutations?
- Error paths handled (not just happy path)?
- Business logic in the correct layer?
- No banned patterns?

**Deep dive** (if mandatory items pass):
- Code follows established project patterns?
- Null/undefined inputs handled?
- Return types match caller expectations?
- Side effects documented or obvious?

### Categorize Findings
- **IMPORTANT**: Correctness bugs, security issues, data integrity risks — would cause wrong behavior or data loss
- **MODERATE**: Architecture violations, missing validation, incomplete error handling — works now but fragile or wrong pattern
- **MINOR**: Style, naming, unnecessary code — no functional impact

Present findings sorted by severity. For each: file, line, what's wrong, suggested fix.
