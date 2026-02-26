# Setup

How to install AI Mentor in your project.

---

## Prerequisites

- **VS Code** with GitHub Copilot extension
- **Copilot Chat** enabled (Skills and Agents require this)
- A project you're actively working on (AI Mentor learns in context, not in isolation)

---

## Installation

### Option 1: Copy the .github directory

```bash
# Clone this repo
git clone https://github.com/YOUR_USERNAME/ai-mentor.git

# Copy the .github directory into your project
cp -r ai-mentor/.github/ your-project/.github/

# If your project already has .github/ contents (e.g., workflows), merge carefully:
cp -rn ai-mentor/.github/ your-project/.github/
```

### Option 2: Git subtree (keeps updates)

```bash
cd your-project
git subtree add --prefix=.github/ai-mentor https://github.com/YOUR_USERNAME/ai-mentor.git main --squash
```

> **Note:** With subtree, you'll need to adjust paths. Option 1 is simpler for most cases.

---

## First Run: Onboarding

After copying the files, open VS Code in your project and invoke the onboarding agent in Copilot Chat:

```
@onboarding
```

The agent will:

1. **Ask about your project** — tech stack, architecture patterns, key files, coding conventions
2. **Ask about you** — current skill level (self-assessed), what you want to improve, what "good code" means to you
3. **Ask about boundaries** — what the AI should never do in your project (e.g., "never modify the database schema without asking")
4. **Generate `PROJECT_CONTEXT.md`** — the bridge between the generic skills and your specific project
5. **Calibrate `PROFILE.md`** — set initial focus areas based on your goals

Review the generated files before committing them.

---

## Mode Selection

AI Mentor ships with LEARN mode active. The `.github/skills/` directory contains the LEARN skills; `.github/skills-fast/` contains the FAST skills.

### When to use LEARN mode

- You're growing in an area (new framework, unfamiliar patterns)
- You want feedback on your reasoning, not just your code
- You're willing to trade speed for depth

### When to use FAST mode

- You're proficient and need velocity
- The task is routine and you don't need scaffolding
- You're under time pressure

### Switching modes

```bash
# Switch to FAST mode
mv .github/skills .github/_skills
mv .github/skills-fast .github/skills

# Switch back to LEARN mode
mv .github/skills .github/skills-fast
mv .github/_skills .github/skills
```

The `copilot-instructions.md` file stays the same in both modes — only the skills directory changes.

---

## What Gets Committed

| File                         | Commit?             | Why                                                                                             |
| ---------------------------- | ------------------- | ----------------------------------------------------------------------------------------------- |
| `copilot-instructions.md`    | Yes                 | Team-shared defaults                                                                            |
| `skills/` and `skills-fast/` | Yes                 | Methodology is team knowledge                                                                   |
| `agents/`                    | Yes                 | Agents are team tools                                                                           |
| `PROFILE.md`                 | **Personal choice** | It's YOUR growth record — commit if you want persistence across machines, .gitignore if private |
| `PROJECT_CONTEXT.md`         | Yes                 | Project knowledge benefits everyone                                                             |

### Suggested .gitignore addition (if keeping profile private)

```gitignore
# AI Mentor - personal profile
.github/PROFILE.md
```

---

## Verification

After setup, test that skills are recognized:

1. Open Copilot Chat in VS Code
2. Say: "Help me plan a new feature"
3. The plan skill should activate — you'll see structured decomposition prompts, not just a code dump

If skills don't trigger:

- Ensure `.github/skills/` contains the SKILL.md files (not nested under a wrong path)
- Check that SKILL.md files have the YAML frontmatter with `name` and `description`
- Restart VS Code if needed — skill discovery happens on workspace load

---

## Updating

If you used Option 1 (copy):

```bash
# Pull latest ai-mentor and re-copy
# WARNING: This overwrites customizations. Back up first.
cp -r ai-mentor/.github/skills/ your-project/.github/skills/
cp -r ai-mentor/.github/skills-fast/ your-project/.github/skills-fast/
cp -r ai-mentor/.github/agents/ your-project/.github/agents/
cp ai-mentor/.github/copilot-instructions.md your-project/.github/copilot-instructions.md
# Do NOT overwrite PROFILE.md or PROJECT_CONTEXT.md
```

If you used Option 2 (subtree):

```bash
git subtree pull --prefix=.github/ai-mentor https://github.com/YOUR_USERNAME/ai-mentor.git main --squash
```
