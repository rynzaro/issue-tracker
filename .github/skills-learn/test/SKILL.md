---
name: test
description: "Trigger when the user asks to write tests, needs test coverage, or when tests should accompany an implementation. Asks user to reason about test strategy before writing."
---

# Test Skill (LEARN Mode)

## Purpose

Test strategy is a design skill. The user reasons about WHAT to test, what NOT to test, and WHY — before the agent writes tests.

---

## When to Trigger

- User says "test", "write tests", "add coverage", "what should we test?"
- After implementation when tests are needed
- User asks about test strategy or testing patterns

---

## Behavior

### Step 1 — Context

Read existing test infrastructure:

- `vitest.config.ts` — configuration
- `tests/helpers/factories.ts` — test data factories
- `tests/helpers/prisma-mock.ts` — Prisma mock setup
- Similar test files in `tests/unit/` — pattern reference

### Step 2 — Ask for Test Strategy

Start with the highest-judgment question first:

> "Before I write tests, I want to hear your thinking. Answer in order:
>
> 1. **What should we NOT test?** (What's out of scope — framework behavior, Prisma internals, third-party code?)
> 2. **Behavior tests**: What should the function DO when given valid input?
> 3. **Contract tests**: What should the function REJECT — and how should it fail?
> 4. **Integration boundaries**: Where does this code touch other services or the database? Do we mock those boundaries or test through them?"

Wait for the user's response.

### Step 3 — Evaluate Strategy

Compare the user's strategy against what's actually needed:

- **"Not test" answer**: Did they correctly exclude Prisma query mechanics, framework routing, and other tested-elsewhere concerns? Or did they over-exclude (skipping important error paths)?
- **Behavior tests**: Did they cover the critical path AND meaningful variations, or just the happy path?
- **Contract tests**: Did they think about invalid input, unauthorized access, missing data? These are where bugs hide.
- **Isolation awareness**: Are they testing the SERVICE layer (right boundary) or accidentally testing Prisma through the service? The mock setup in `tests/helpers/prisma-mock.ts` exists for a reason.

### Step 4 — Write Tests

Follow project conventions exactly:

- **Framework**: Vitest (`describe`, `it`, `expect`)
- **Factories**: Use `tests/helpers/factories.ts` for test data
- **Mocks**: Use `tests/helpers/prisma-mock.ts` for Prisma mock setup
- **File naming**: Mirror source structure — `lib/services/task.service.ts` → `tests/unit/services/task.service.test.ts`
- **Test shape**: Arrange (factory data) → Act (call service function) → Assert (expected outcome)
- **Test behavior, not implementation**: Assert on return values and side effects, not on internal function calls

### Step 5 — Score

Rate:

- **Testing Strategy**: Did they identify the right things to test AND the right things to skip?
- **System Thinking**: Did they reason about boundaries and isolation?

---

## Judgment, Not Procedure

A good test suite has high SIGNAL, not high COVERAGE. Track whether the user:

- Tests public interfaces (service functions) or internal helpers (implementation detail)
- Thinks about what breaks when requirements change (brittle vs. resilient tests)
- Correctly identifies the mock boundary (Prisma mock = service tests; no mock = integration tests)
- Knows when NOT to test (over-testing is as much a smell as under-testing)
