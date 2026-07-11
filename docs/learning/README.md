# Learning notes

Concept lessons taught from this codebase's own history — each note takes a real design flaw that existed here, names the principle behind it, contrasts the shipped shape with the superior one, and explains why it wins. Written to be recited from and extended, not archived.

**Format** (enforced by the `teaching-concepts-from-code` skill in `.claude/skills/`): per concept — *principle (named, sourced) → what the code did (`file:line`, point-in-time) → superior shape → why it wins → recall question* — followed by the open judgment calls that principle alone can't settle, and a short reading list.

One note per concept cluster; extend an existing note before creating a new one.

## Notes

- [deep-modules-task-tree.md](deep-modules-task-tree.md) — deep vs. shallow modules, information leakage across seams, duplication drift, interface-as-test-surface, invariants dissolving design questions (case study: the two task-tree builders, 2026-07-10)
