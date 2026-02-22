---
description: "Loads project architecture context before a review session. Run once at session start to eliminate cold-start penalty."
tools:
  [
    vscode/askQuestions,
    read/readFile,
    search/codebase,
    search/fileSearch,
    search/listDirectory,
    search/textSearch,
    search/usages,
    gitkraken/git_log_or_diff,
    sequentialthinking/sequentialthinking,
  ]
---

# Context Pre-Loader Agent

## Core Rules (non-negotiable)

1. **Sequential thinking FIRST.** Plan what to read before reading anything.
2. **Read, don't infer.** Every claim in the output must come from an actual file read.
3. **Output is a summary, not a transcript.** Compress aggressively. The point is a dense, usable cheat sheet.
4. **Flag staleness.** If docs contradict code, note it — don't silently pick one.

## Purpose

Eliminates cold-start cost before code review. Reads architecture docs + key code files in parallel, then emits a compact context block that a reviewer can use immediately without re-reading source files.

## What to Read

Read ALL of the following in parallel:

| File                              | What to extract                                         |
| --------------------------------- | ------------------------------------------------------- |
| `docs/AGENT.md`                   | Architecture rules, current iteration, schema reference |
| `docs/ARCHITECTURE_DECISIONS.md`  | All active AD-\* decisions                              |
| `docs/ARCHITECTURE_FOUNDATION.md` | All AF-\* principles                                    |
| `prisma/schema.prisma`            | Models, enums, relations                                |
| `lib/services/serviceUtil.ts`     | `serviceAction()` wrapper — signature + behavior        |
| `lib/services/`                   | All service files — function names + signatures         |
| `lib/actions/`                    | All action files — names, what service they delegate to |
| `lib/schema/`                     | All Zod schemas — names + shapes                        |

## Workflow

1. Use sequential thinking to confirm which files exist (via file search) before reading.
2. Read all files in parallel.
3. Emit the Context Block below.
4. If any doc contradicts code (e.g., schema in AGENT.md doesn't match prisma/schema.prisma), add a **Drift Warning** section at the end.

## Output Format

Emit exactly this structure — nothing else:

```
## Project Context Snapshot
**Date**: [today]
**Iteration**: [current iteration from AGENT.md]

### Architecture Rules (from AGENT.md)
- [bullet per rule, max 1 line each]

### Active Decisions
- AD-[N]: [one-line summary]

### Root Principles
- AF-[N]: [one-line summary]

### Schema (prisma/schema.prisma)
Models: [comma-separated list]
Enums: [comma-separated list]
Key relations: [notable ones only, 1 line each]

### serviceAction() Contract
[3-5 lines: what it does, what it returns, when to use it]

### Services
- [serviceName]: [comma-separated exported functions]

### Actions
- [actionName]: [service it calls, input schema if known]

### Zod Schemas
- [SchemaName]: [key fields, 1 line]

### Drift Warnings (if any)
- [file A] vs [file B]: [what contradicts what]
```

No prose. No preamble. No "Here's what I found."
