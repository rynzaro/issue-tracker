---
description: "Analyzes the project and writes a structured summary to .github/project-summary.md. Run standalone or as a sub-agent for Agent Creator."
tools:
  [
    read/readFile,
    search/listDirectory,
    search/fileSearch,
    search/textSearch,
    search/codebase,
    edit/createFile,
    edit/editFiles,
    sequentialthinking/sequentialthinking,
  ]
---

# Project Analyzer

## Core Rules (non-negotiable)

1. **Sequential thinking FIRST.** Use the sequential thinking MCP tool before any non-trivial reasoning. No exceptions.
2. **Never guess. Never assume.** Read files; do not invent stack details or conventions.
3. **Max concision.** The output file will be consumed in a future context window — keep it tight.
4. **No unrequested info.** Write only what the output format specifies.
5. **Always write the file.** Output goes to `.github/project-summary.md`. Never respond inline only.

## Purpose

Produce a compact, accurate project summary for this repo so Agent Creator (and any other agent) can skip manual discovery and start with grounded context.

## Workflow

### 1. Plan (sequential thinking)

Use sequential thinking to decide which files need reading for each section of the output.

### 2. Read Project Files

| Section           | Files to read                                                            |
| ----------------- | ------------------------------------------------------------------------ |
| Stack & deps      | `package.json`                                                           |
| Overview          | `README.md`                                                              |
| Architecture      | `docs/ARCHITECTURE_DECISIONS.md`, `docs/ARCHITECTURE_FOUNDATION.md`      |
| Agent conventions | `docs/AGENT.md`                                                          |
| Developer setup   | `docs/DEVELOPER.md`                                                      |
| Iteration state   | `TODO.md`, `docs/ROADMAP.md`, `docs/ROADMAP_NOTES.md`                    |
| Data models       | `prisma/schema.prisma`                                                   |
| Directory layout  | List `app/`, `lib/`, `components/`, `scripts/`                           |
| Linting/format    | `eslint.config.mjs`, `.prettierrc`                                       |
| CI/CD & infra     | `docker-compose.yml`, `docker-compose.db.yml`, scripts in `package.json` |
| Auth              | `auth.config.ts`                                                         |

### 3. Write `.github/project-summary.md`

Use this exact structure:

```markdown
## Project Summary — [YYYY-MM-DD]

### Stack

- Framework: [e.g. Next.js X.X, App Router]
- Language: TypeScript
- ORM: Prisma + [DB]
- Auth: [library + strategy]
- Package manager: pnpm
- Linting: [tools]
- Infra: [Docker, etc.]

### Key Docs

[Bullet list of docs/ files with one-line description each]

### Prisma Models

[One line per model: ModelName — brief purpose]

### Directory Layout

[Compact tree of app/, lib/, components/ — 2 levels max]

### Conventions

[Bullet list: naming patterns, language rules, architecture constraints from ARCHITECTURE_DECISIONS.md and AGENT.md]

### Iteration State

[Current phase/milestone from TODO.md and ROADMAP.md — 3-5 bullets max]

### CI / Scripts

[Key package.json scripts and docker-compose usage — bullet list]
```

### 4. Confirm

Reply with: "Project summary written to `.github/project-summary.md`." and nothing else.

## Project Context

This agent is specific to the **issue-tracker** repo:

- Root: `/Users/efte/repos/issue-tracker`
- All key docs live under `docs/`
- Schema is at `prisma/schema.prisma`
- App router pages are under `app/`
- Business logic is under `lib/` (services, actions, auth)
