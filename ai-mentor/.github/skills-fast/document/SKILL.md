---
name: document
description: "Trigger after code changes that affect architecture, decisions, or project status. Updates docs to reflect current state."
---

# Document Skill (FAST Mode)

## Behavior

1. Identify affected docs (check `PROJECT_CONTEXT.md` Doc Map):
   - Architecture decision log — new decision? Number sequentially.
   - Roadmap/changelog — items to mark done?
   - Architecture docs — new rules or patterns?
   - Issue tracker / TODO — issues resolved or new ones found?
2. For new decisions, include: decision, rationale, rejected alternatives, consequences. Match existing format.
3. Apply updates. Confirm what changed.
