---
name: test
description: "Trigger when the user asks to write tests, needs test coverage, or tests should accompany an implementation."
---

# Test Skill (FAST Mode)

## Behavior

1. Read existing patterns: `vitest.config.ts`, `tests/helpers/factories.ts`, `tests/helpers/prisma-mock.ts`, similar test files in `tests/unit/`.
2. Determine what to test:
   - **Behavior tests**: Critical paths — does the function do what it should?
   - **Contract tests**: Rejection paths — does it fail correctly on bad input?
   - **Skip**: Prisma internals, framework behavior, third-party code
3. Write tests following project conventions:
   - **Framework**: Vitest (`describe`, `it`, `expect`)
   - **Factories**: `tests/helpers/factories.ts`
   - **Mocks**: `tests/helpers/prisma-mock.ts`
   - **Naming**: `lib/services/X.ts` → `tests/unit/services/X.test.ts`
   - **Shape**: Arrange (factory) → Act (call function) → Assert (outcome)
   - **Principle**: Test behavior, not implementation
