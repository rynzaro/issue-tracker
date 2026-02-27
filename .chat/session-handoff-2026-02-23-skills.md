## Session Handoff — 2026-02-23 (Skill Architecture Design)

### Prior Session

See `.chat/session-handoff-2026-02-23.md` for the **Project CRUD + Task CRUD** implementation work (12 open issues remain). That work is on branch `feat/8-implement-start-task-functionality`, all changes unstaged.

### Active Work

Designed a **dual-mode Copilot skill architecture** (FAST mode for speed, LEARN mode for growth). Design is COMPLETE but NO files have been created yet. User was asked for confirmation on the skill catalog + rating system — **no response received** before handoff was requested.

### Decisions Made This Session

1. **Skills over Agents**: Skills auto-load based on triggers; agents require manual `@`-switching. For a solo dev, skills are better. The 10-agent persona design in `agents/README.md` is being replaced.
2. **Dual physical modes**: Two folders `skills-fast/` (7 skills) and `skills-learn/` (9 skills). One is renamed/symlinked to `skills/` to activate it. `copilot-instructions.md` stays always-active regardless of mode.
3. **Three-tier boundaries** (in `copilot-instructions.md`):
   - **Always do**: Sequential thinking before non-trivial reasoning, clarify ambiguity, auth checks
   - **Ask first**: Schema changes, new dependencies, new patterns
   - **Never**: Business logic in components, skip auth, rubber-stamp reviews
4. **Implementation Coach** (LEARN-only `implement/` skill): Asks "you or me?" — if user implements, gives spec + hints + reviews; if agent implements, explains reasoning and quizzes.
5. **Learner Profile** (LEARN-only): `PROFILE.md` persists ratings per category via git, updated after each scored interaction.
6. **Physical mode separation**: Folder rename at `skills/` level only, not flags the model might ignore.
7. **Old skills deleted**: Both `ask-user-questions/` and `ask-user-questions-extended/` content absorbed into new architecture.

### Skill Catalog

#### FAST Mode (7 skills in `skills-fast/`)

| Skill              | Purpose                                                                              |
| ------------------ | ------------------------------------------------------------------------------------ |
| `plan/`            | Sequential thinking → decompose into steps → present plan → get approval             |
| `implement/`       | Read AGENT.md → deliberate approaches → present decision + rationale → implement     |
| `review/`          | Structured code review (correctness, architecture compliance, edge cases)            |
| `test/`            | Write tests following vitest patterns in `tests/`, match existing factory/mock setup |
| `document/`        | Update ROADMAP.md, ARCHITECTURE_DECISIONS.md, AGENT.md after changes                 |
| `refactor/`        | Identify smells → propose changes with tradeoffs → implement after approval          |
| `session-handoff/` | Produce structured handoff summary for new context window                            |

#### LEARN Mode (9 skills in `skills-learn/`)

| Skill              | Differs from FAST                                                             | Categories Scored                |
| ------------------ | ----------------------------------------------------------------------------- | -------------------------------- |
| `plan/`            | Asks user to attempt decomposition first, then compares                       | Architecture, System Thinking    |
| `implement/`       | "You or me?" — spec/hints/review if user codes; explain + quiz if agent codes | Implementation, Error Handling   |
| `review/`          | User does first review pass, agent reveals what they missed                   | Architecture, Testing, Tradeoffs |
| `test/`            | Asks "what should we test?" before writing — evaluates test strategy thinking | Testing Strategy                 |
| `document/`        | Asks user to draft decision rationale, refines it                             | System Thinking                  |
| `refactor/`        | Presents smell, asks user to propose fix before showing agent's approach      | Architecture, Tradeoffs          |
| `session-handoff/` | Same as FAST (no learning dimension)                                          | —                                |
| `tradeoff-coach/`  | LEARN-only. Surfaces tradeoffs in decisions, asks user to evaluate            | Tradeoff Analysis                |
| `learner-profile/` | LEARN-only. Manages PROFILE.md, calibrates ratings, suggests focus areas      | —                                |

### Rating System

**5 Tiers** (each with .1 beginning, .2 solid, .3 almost-next-level):

- **Junior (1.x)**: Needs guidance on fundamentals
- **Mid-Level (2.x)**: Can implement with some direction
- **Senior (3.x)**: Makes sound independent decisions
- **Staff (4.x)**: Sees system-wide implications, designs for future
- **Exceptional (5.x)**: Novel solutions, teaches others

**7 Core Assessment Categories**:

1. Architecture & Patterns
2. Implementation Quality
3. Tradeoff Analysis
4. Testing Strategy
5. Data Modeling
6. Error Handling
7. System Thinking

**3 Optional Categories** (activate when relevant):

- Performance & Optimization
- Security Awareness
- Developer Experience / API Design

**PROFILE.md** stores: current rating per category, evidence log (dated entries with rating changes + reasoning), focus areas, session count.

### Changes Applied This Session

- `.github/skills/ask-user-questions-extended/SKILL.md` — Fixed YAML frontmatter (name to match folder, description to single-line quoted string)
- Identified broken path: `.github/skills/ask-user-questions/SKILL.MD/SKILL.md` (nested directory issue)

### Pending / Blocked

- **User confirmation not received**: The full skill catalog + rating system was presented, user was asked "Does the skill catalog and rating system look right?" — no response before handoff request.
- **All skill files need to be created**: ~17 files total (1 `copilot-instructions.md` + 7 FAST skills + 9 LEARN skills)
- **Old skills need cleanup**: Delete `ask-user-questions/` and `ask-user-questions-extended/` (or absorb into new structure)
- **`agents/README.md` disposition**: 10-agent design is superseded — decide whether to delete or archive

### Key Context

- **Referenced articles**: Two O'Reilly articles on "Claude Skills" and "AI Agent Specs" informed the design. Key insight: skills are behavior-per-phase that auto-trigger; agents are persistent personas that require manual activation.
- **User's primary pain**: "I don't learn from the output" — wants reasoning-based assessment, not just code delivery.
- **User's key philosophy**: "EVERYTHING IS A TRADEOFF" and "reasoning is the important skill — not the decision making."
- **`copilot-instructions.md` role**: Global defaults that apply in ALL modes — sequential thinking, clarify ambiguity, read AGENT.md, three-tier boundaries. This eliminates the user having to repeat these instructions every session.
- **Stack**: Next.js 16, React 19, Prisma 7, MariaDB, NextAuth 5, Tailwind 4, Zod, Vitest, VS Code Copilot Chat, Sequential Thinking MCP, GitKraken MCP.

### Continuation Plan

1. **Confirm or adjust** the skill catalog + rating system with the user (they haven't approved yet)
2. **Create `copilot-instructions.md`** first — this is the highest-value file (stops the "repeat myself every session" problem)
3. **Create LEARN mode skills** (user's primary pain is learning, so this mode matters most)
4. **Create FAST mode skills** (subset of LEARN, simpler)
5. **Create `PROFILE.md` template** for the learner profile
6. **Delete old skill files** (`ask-user-questions/`, `ask-user-questions-extended/`)
7. **Update `agents/README.md`** — either delete or add a note that it's superseded by skills

### Files to Read First

1. `.chat/session-handoff-2026-02-23.md` — prior session's CRUD work + open issues
2. `docs/AGENT.md` — architecture rules (skills reference this, don't duplicate)
3. `agents/README.md` — the 10-agent design being replaced (context for what was there before)
4. `.github/skills/ask-user-questions-extended/SKILL.md` — the fixed skill file (example of format)
5. `docs/ARCHITECTURE_DECISIONS.md` — active decisions
6. `docs/ROADMAP.md` — iteration status
