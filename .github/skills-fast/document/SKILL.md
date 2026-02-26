---
name: document
description: "Trigger after code changes that affect architecture, decisions, or roadmap status. Updates docs to reflect current state."
---

# Document Skill (FAST Mode)

## Behavior

1. Identify affected docs:
   - `docs/ARCHITECTURE_DECISIONS.md` — new AD? Number sequentially.
   - `docs/ROADMAP.md` — checklist items to mark done?
   - `docs/AGENT.md` — new rule, iteration status, file-change-guide entry?
   - `TODO.md` — issues resolved or new ones found?
2. For new ADs, include: decision, rationale, rejected alternatives, consequences. Match existing format.
3. Apply updates. Confirm what changed.
