# AI Mentor

A developer growth framework powered by VS Code Copilot Skills and Agents.

**AI Mentor turns your AI coding assistant into a mentor** that adapts to your skill level, tracks your growth with evidence, and teaches you to think — not just to ship.

---

## What This Is

A set of Copilot Skills, Agents, and configuration files that you drop into any project to transform GitHub Copilot from a code-completion tool into a personalized learning system.

**Skills** encode _how to think about_ planning, implementing, reviewing, testing, documenting, and refactoring — not just _what steps to follow_.

**Agents** handle setup (onboarding) and evolution (skill creation).

**PROFILE.md** tracks your growth with specific evidence, not vague impressions.

---

## How It Works

### Two Modes

| Mode      | Purpose                                                                                 | When to Use                         |
| --------- | --------------------------------------------------------------------------------------- | ----------------------------------- |
| **LEARN** | Teaching scaffolding: specs before code, hints not solutions, tradeoff quizzes, scoring | You're growing in an area           |
| **FAST**  | Direct execution: same methodology, no teaching overhead                                | You're proficient and need velocity |

Switch by renaming directories:

```bash
# Activate LEARN mode (default)
mv .github/skills-fast .github/_skills-fast
mv .github/_skills .github/skills

# Activate FAST mode
mv .github/skills .github/_skills
mv .github/_skills-fast .github/skills
```

### Core Skills

| Skill               | What It Teaches                                                                 |
| ------------------- | ------------------------------------------------------------------------------- |
| **plan**            | Decomposition, dependency ordering, knowing when a plan is complete             |
| **implement**       | Spec discipline, pattern recognition, reading before writing                    |
| **review**          | Systematic evaluation, severity calibration, learning from your own overcaution |
| **test**            | Knowing what NOT to test, behavior vs. implementation, test isolation           |
| **document**        | Routine vs. decision documentation, writing for the next reader                 |
| **refactor**        | Right-time judgment, root cause before solution, behavior preservation          |
| **tradeoff-coach**  | Recognizing decisions disguised as facts, naming what's traded _(LEARN only)_   |
| **session-handoff** | Capturing context that survives session boundaries                              |
| **learner-profile** | Evidence-based self-assessment, focus area identification _(LEARN only)_        |

### Agents

| Agent              | Purpose                                                                     |
| ------------------ | --------------------------------------------------------------------------- |
| **@onboarding**    | Interviews you about your project and goals, generates `PROJECT_CONTEXT.md` |
| **@skill-creator** | Packages recurring expertise into new skills                                |

---

## Quick Start

### 1. Copy into your project

```bash
cp -r ai-mentor/.github/ your-project/.github/
```

### 2. Run the onboarding agent

In VS Code Copilot Chat, invoke:

```
@onboarding
```

This interviews you about your project structure, tech stack, goals, and what "good code" means to you. It generates `PROJECT_CONTEXT.md` — the bridge between the generic framework and your specific project.

### 3. Start working

The skills trigger automatically based on what you're doing. Say "implement the login page" and the implement skill activates. Say "review this PR" and the review skill activates.

Your growth is tracked in `PROFILE.md` with specific evidence from every interaction.

---

## Philosophy

See [PHILOSOPHY.md](PHILOSOPHY.md) for the learning science, design principles, and anti-patterns behind the system.

**Core beliefs:**

- Struggle at the right level is where learning happens
- Skills encode judgment, not procedure
- Growth is personal — no leaderboards, no comparisons
- Feedback must be immediate and specific
- The learner controls the pace

---

## Customization

See [CUSTOMIZATION.md](CUSTOMIZATION.md) for:

- Adding new skills
- Modifying profile categories
- Adjusting assessment intensity
- Creating project-specific skill variants

---

## Project Structure

```
.github/
├── copilot-instructions.md     # Always-loaded global defaults
├── PROFILE.md                  # Your growth record
├── PROJECT_CONTEXT.md          # Your project's specifics (generated)
├── skills/                     # Active skill set (LEARN by default)
│   ├── plan/SKILL.md
│   ├── implement/SKILL.md
│   ├── review/SKILL.md
│   ├── test/SKILL.md
│   ├── document/SKILL.md
│   ├── refactor/SKILL.md
│   ├── session-handoff/SKILL.md
│   ├── tradeoff-coach/SKILL.md
│   └── learner-profile/SKILL.md
├── skills-fast/                # Swap-in for velocity mode
│   ├── plan/SKILL.md
│   ├── implement/SKILL.md
│   ├── review/SKILL.md
│   ├── test/SKILL.md
│   ├── document/SKILL.md
│   ├── refactor/SKILL.md
│   └── session-handoff/SKILL.md
└── agents/
    ├── onboarding.agent.md
    └── skill-creator.agent.md
```

---

## License

MIT
