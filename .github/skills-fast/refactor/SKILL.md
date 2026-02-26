---
name: refactor
description: "Trigger when the user wants to refactor, improve, or clean up code. Identifies smells, proposes changes with tradeoffs, implements after approval."
---

# Refactor Skill (FAST Mode)

## Behavior

1. **Right time?** Before starting: Is this blocking progress or cosmetic? Will a pending feature touch this code anyway? If not worth doing now, say so.
2. **Identify the smell** with specific file/line references. Describe what's wrong and the root cause.
3. **Propose 1–2 approaches** with tradeoffs:
   - What changes
   - What stays the same (preserved behaviors)
   - Risk: what could break
   - Cost: how many files affected
4. **Implement after approval.** Verify no behavior changed — same inputs should produce same outputs. Run tests if available.
