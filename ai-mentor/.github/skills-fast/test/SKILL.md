---
name: test
description: "Trigger when the user asks to write tests, needs test coverage, or tests should accompany an implementation."
---

# Test Skill (FAST Mode)

## Behavior

1. Read existing test patterns from the project (check `PROJECT_CONTEXT.md` for test infrastructure, then read actual test files for conventions).
2. Determine what to test:
   - **Behavior tests**: Critical paths — does the function do what it should?
   - **Contract tests**: Rejection paths — does it fail correctly on bad input?
   - **Skip**: ORM internals, framework behavior, third-party code
3. Write tests following project conventions:
   - **Framework**: Use the project's test framework
   - **Factories/Helpers**: Use existing test data factories and helpers
   - **Mocks**: Use established mock patterns
   - **Naming**: Mirror source structure
   - **Shape**: Arrange → Act → Assert
   - **Principle**: Test behavior, not implementation
