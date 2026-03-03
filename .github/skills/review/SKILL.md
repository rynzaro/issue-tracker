---
name: review
description: "Trigger when the user asks for a code review or after implementation. Structured review for correctness, architecture compliance, and edge cases."
---

# Review Skill (FAST Mode)

## Behavior

### Mandatory 5 (always check)
1. Auth check present in every server action?
2. Zod validation on all mutation inputs?
3. `deletedAt IS NULL` in all queries?
4. Error paths handled (not just happy path)?
5. Business logic in services only (not actions or components)?

### Deep Dive (check if mandatory 5 pass)
6. Server action follows 5-step pattern (auth → validate → service → revalidate → return)?
7. No banned patterns (DB cascades, Toggl imports outside feature, env secrets)?
8. Null/undefined inputs handled?
9. Soft-deleted records can't leak through?
10. Return types match caller expectations?
11. Event emission after mutations (if iteration 2+ active)?
12. Checkpoint triggers (if iteration 3+ active)?

### Categorize Findings
- **IMPORTANT**: Correctness bugs, security issues, data integrity risks — would cause wrong behavior or data loss
- **MODERATE**: Architecture violations, missing validation, incomplete error handling — works now but fragile or wrong pattern
- **MINOR**: Style, naming, unnecessary code — no functional impact

Present findings sorted by severity. For each: file, line, what's wrong, suggested fix.
