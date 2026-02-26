# VS Code Copilot Agent Suite

> **Superseded**: This 10-agent design is replaced by the skills architecture in `.github/skills/` (LEARN mode) and `.github/skills-fast/` (FAST mode). Skills auto-trigger based on context; agents required manual `@`-switching. Kept for reference only. See `.github/copilot-instructions.md` for the active global defaults.

A collection of 10 specialized AI agents for VS Code Copilot Chat that work together to cover the full development lifecycle — from planning through implementation to review and documentation.

## Quick Start

1. Copy the `agents/` directory into your project's `.github/agents/` folder
2. Run **Agent Creator** — it will interview you and customize each agent for your project
3. Or manually edit the `## Project Context (customize)` section in each agent

## Agents

| Agent                 | Purpose                                  | When to use                                 |
| --------------------- | ---------------------------------------- | ------------------------------------------- |
| **Agent Creator**     | Generates project-specific agents        | Once per project setup                      |
| **Project Analyzer**  | Scans project, writes structured summary | Before Agent Creator, or to refresh context |
| **Planner**           | Interview-driven iteration planning      | Start of each iteration/sprint              |
| **Codebase Explorer** | Task-scoped context mapping              | Before starting a new task                  |
| **Task Decomposer**   | Atomic step list from context snapshot   | After Explorer, before coding               |
| **Context Preloader** | Loads architecture context for reviews   | Start of a review session                   |
| **Reviewer**          | Code review + tradeoff quizzing          | After code changes                          |
| **Doc Keeper**        | Audits docs vs code, fixes drift         | After code changes                          |
| **Tradeoff Coach**    | Socratic engineering quizzes             | Anytime — for learning                      |
| **Session Handoff**   | Compress context for new session         | When context window fills up                |

## Workflow

### Setup (once)

```
Project Analyzer → Agent Creator → [customized agents]
```

Run Project Analyzer to scan your project. Agent Creator reads the summary and interviews you to generate project-specific agents.

### Pre-coding

```
Planner → Codebase Explorer → Task Decomposer → [start coding]
```

Planner creates the iteration plan. Explorer maps the codebase for a specific task. Decomposer turns that into an ordered step list.

### During coding

```
[code changes] → Reviewer → Tradeoff Coach (optional)
                → Doc Keeper
```

Reviewer checks changes against architecture rules (uses Context Preloader on cold start). Can hand off tradeoffs to Coach. Doc Keeper audits docs after changes.

### Session management

```
[context window filling up] → Session Handoff → [paste into new session]
```

## Agent Details

### Agent Creator

**Problem solved**: Manually writing `.agent.md` files is tedious and error-prone — you miss conventions, hallucinate paths, forget rules.

| Strengths                                            | Weaknesses                                          |
| ---------------------------------------------------- | --------------------------------------------------- |
| Bootstraps an entire agent suite from scratch        | Quality depends on user interview answers           |
| Enforces consistent format across all agents         | Can hallucinate file paths without Project Analyzer |
| Interview-first ensures agents match actual workflow |                                                     |

---

### Project Analyzer

**Problem solved**: Every agent needs project context, but reading the project manually wastes context window and is inconsistent.

| Strengths                             | Weaknesses                                |
| ------------------------------------- | ----------------------------------------- |
| Fast, structured project overview     | Snapshot is static — stales within a day  |
| Single source of truth for all agents | Misses runtime/infra details not in files |
| Language/framework agnostic scanning  |                                           |

---

### Planner

**Problem solved**: Starting work without a plan leads to scope creep, missed dependencies, and wasted effort.

| Strengths                             | Weaknesses                          |
| ------------------------------------- | ----------------------------------- |
| Interview-first prevents wasted work  | Needs up-to-date docs to plan well  |
| Flags scope creep explicitly          | Cannot verify technical feasibility |
| Atomic, dependency-ordered task lists |                                     |

---

### Codebase Explorer

**Problem solved**: Coding agents waste context reading irrelevant files. You need a tight, task-scoped briefing.

| Strengths                                       | Weaknesses                            |
| ----------------------------------------------- | ------------------------------------- |
| Tight, task-scoped context                      | Can under-explore if scope is unclear |
| Structured snapshot reusable by multiple agents | Only as good as its search queries    |
| Flags gaps and uncertainties explicitly         |                                       |

---

### Task Decomposer

**Problem solved**: Jumping from "task description" to "coding" skips the critical step of ordering changes correctly (schema before services, services before UI).

| Strengths                                    | Weaknesses                                |
| -------------------------------------------- | ----------------------------------------- |
| Atomic, ordered steps with file targets      | Depends on snapshot quality from Explorer |
| Enforces architecture layering in step order | Cannot validate technical feasibility     |
| Clear action verbs (ADD, MODIFY, DELETE)     |                                           |

---

### Context Preloader

**Problem solved**: Cold-starting a code review means re-reading architecture docs and services, burning context on discovery instead of review.

| Strengths                                   | Weaknesses                                  |
| ------------------------------------------- | ------------------------------------------- |
| Eliminates cold-start penalty for reviewers | Output can go stale within a session        |
| Flags drift between docs and code           | Reads a fixed file set — may miss new files |
| Dense, structured cheat sheet format        |                                             |

---

### Reviewer

**Problem solved**: Self-review is blind to your own assumptions. You need a senior-level perspective that checks patterns, data isolation, and tradeoffs.

| Strengths                                           | Weaknesses                                        |
| --------------------------------------------------- | ------------------------------------------------- |
| Thorough: correctness, patterns, types, performance | Needs Context Preloader for cold start            |
| Tradeoff quizzing built into review flow            | Can over-flag style issues at high aggressiveness |
| Never rubber-stamps — always finds something        |                                                   |

---

### Doc Keeper

**Problem solved**: Documentation drifts from code silently. Nobody notices until a new developer reads stale docs.

| Strengths                                            | Weaknesses                                             |
| ---------------------------------------------------- | ------------------------------------------------------ |
| Catches drift others miss                            | False positives if docs are intentionally aspirational |
| Reads code as ground truth, not the other way around | Cannot verify runtime behavior                         |
| Post-change mode for targeted audits                 |                                                        |

---

### Tradeoff Coach

**Problem solved**: Developers make decisions without examining alternatives. Tradeoff awareness is the gap between mid-level and senior engineers.

| Strengths                                         | Weaknesses                               |
| ------------------------------------------------- | ---------------------------------------- |
| Builds engineering judgment through practice      | Limited to known tradeoff categories     |
| Socratic — reveals what you know, doesn't lecture | Needs file access to quiz on actual code |
| Scoring tracks growth over time                   |                                          |

---

### Session Handoff

**Problem solved**: When the context window fills up, starting a new session loses all accumulated context.

| Strengths                                        | Weaknesses                             |
| ------------------------------------------------ | -------------------------------------- |
| Preserves context across sessions                | Lossy compression — nuance can be lost |
| Structured format ensures actionable handoff     | User must validate the summary         |
| Explicit "files to read first" for quick ramp-up |                                        |

## Customization

Each agent has a `## Project Context (customize)` section at the bottom. Fill in your project-specific:

- File paths (schema, services, actions, docs)
- Tech stack details
- Architecture layering rules
- Active conventions

Or just run **Agent Creator** — it does this automatically.

## Requirements

- VS Code with GitHub Copilot Chat
- [Sequential Thinking MCP server](https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking) (used by all agents)
- Optional: GitKraken MCP for git log/diff access
