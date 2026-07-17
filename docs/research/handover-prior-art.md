# Handover behind a privacy boundary — prior art

Research for #95, stress-testing the model in #88. Date: 2026-07-17.

No `docs/research/` existed. Created it. Move if the wrong home.

**Method**: official docs + vendor issue trackers only. Community forum posts are used *only* as pointers to a vendor page, never as a claim. Where I could not verify something, it says so.

## Verdict up front

The spine mostly survives. Three findings hurt:

1. **"Narrowest dial on path" is contradicted by the closest prior art.** Google Drive forbids narrowing on a child — permissions widen downward, never narrow. Narrowing only happens by cutting the chain at a boundary. Our rule is not wrong, but it is not the industry's rule, and Drive's reason for banning it is worth reading (below).
2. **The recipient-controlled upward dial has zero prior art.** Not one tool of the seven checked. In every one, visibility is the *granter's* or an *admin's* call. I found no doc calling it an anti-pattern — the absence is silent, so this is weak evidence, not proof it's wrong. But the pattern is uniform enough to demand a reason.
3. **Jira shipped our two-clock split and users still misread it**, with a docs-vs-behaviour bug that Atlassian closed "Won't Do". The trap is naming, not modelling.

The container rule (point 6/7) comes out *stronger* than it went in — MS Project independently arrived at the same place, including the exact workaround in our point 7.

---

## 1. Sub-tasks across a permission boundary

### Jira — boundary is the project, not the node

Sub-tasks have no dial of their own:

> "Sub-tasks inherit the issue security level of their parent."

and it is "not possible to assign security levels to sub-tasks" in Jira Cloud.
— [Allow specific users to view tasks and subtasks with security levels](https://support.atlassian.com/jira/kb/allow-specific-users-to-view-tasks-and-subtasks-with-security-levels-in-jira/)

So Jira **cannot express our design at all**. The delegator keeps seeing everything, because the recipient can only be let in at project granularity via the permission scheme ('Browse Project' gates the whole project — [JIRA Permissions General Overview](https://support.atlassian.com/jira/kb/jira-permissions-general-overview/)).

Takeaway: Jira is a cautionary tale, not a model. Putting the boundary at the project is what forces the "one giant project everyone can see" outcome we're trying to avoid.

### Linear — closest match to our model

Linear's private-team issue sharing is nearly our downward-dial-off case:

> "Those who are not a member of the private team will not be able to see issues associated with the team."

> Shared non-members "can view and update the issue and any of its sub-issue tree" but "can't view or change the team, project, cycle, or project milestone".

> "can't share the issue again unless they already have access to the team"

> "Sub-issues share settings can be managed independently of their parent issue, so access can be adjusted more precisely."

— [Private teams](https://linear.app/docs/private-teams), [changelog 2026-02-13](https://linear.app/changelog/2026-02-13-advanced-filters-and-share-issues-in-private-teams) ("You can assign them a specific issue from your team without giving them access to the rest of the team's data." Enterprise only.)

Three of our invariants show up here independently:

- **window, not relocation** — the issue stays in the private team; the outsider gets a view.
- **hidden top** — recipient sees the issue + subtree, explicitly *not* the project/cycle/team above it. That is our "chain hidden → it is the recipient's visible root".
- **one hop** — "can't share the issue again" is literally our "you may only reveal to someone you can see".

This is the single strongest validation in the whole file. Linear, from a different direction, built our point 3 and point 4.

But note **who holds the dial**: team *owners* decide who may share, via Team settings → Access and permissions → Issue sharing. Granter-side. Not the recipient.

### Asana — window model, no dial, and a documented orphan trap

> "If you add a collaborator to a task within a private project, the collaborator will have access to that task and any of its subtasks—but not any of the other tasks in the project."
— [Asana permissions guide](https://asana.com/resources/asana-tips-permissions)

Same window primitive again: one node + its subtree, nothing sideways.

The trap: Asana users end up with a **visible subtask under an invisible parent, and no way out** — reported as being unable to click "request permission" because the parent can't be reached. I could only find this stated on the Asana *forum*, not in official docs, so treat it as a lead rather than a fact. It matches the shape of our point 3 consequence, and it is the failure mode our "visible roots" rendering has to answer for.

### Basecamp — whole-project boundary, granter decides

> Clients "only see the items that have been made visible to them, and everything is private by default so you'll need to change the visibility of an item for them to see it."
— [Changing what Clients can see and do](https://3.basecamp-help.com/article/693-changing-what-clients-can-see-and-do)

Default-deny + explicit granter-side reveal. No recipient dial. No node-level hierarchy dial.

### Height — task-level share, granter decides

> "Most task permissions are managed through list permissions: if a user has access to a list a task is on, they have access to the task on that list."

Guests/members "can be added ... to specific tasks through the task Share menu. They will only have access to the specific task they've been added to."
— [Sharing & permissions](https://help.height.app/en/articles/3584125-sharing-permissions)

Again: window per node, granter-side. I did not verify Height's behaviour for a subtask whose parent is private.

---

## 2. Does the recipient ever control what flows back up?

**No. Not in any of the seven.** Summary of who holds the upward dial:

| Tool | Who decides what the upper level sees |
|---|---|
| Jira | Project admin, via permission scheme / security level |
| Linear | Team owner (configures who may share at all) |
| Asana | The person granting access |
| Basecamp | Admin / granter ("only administrators can change project permissions") |
| Height | Whoever shares the task/list |
| Toggl Track | Workspace admin |
| Harvest | Account admin, via permission roles |

Time trackers are the sharpest test, because that's where "what flows up" *is* the product:

> "Managers will see time for projects they manage and their assigned people, and Members will see only their own time."
— [Harvest team permissions](https://support.getharvest.com/hc/en-us/articles/360048687451-Team-permissions)

Toggl: admins "can see all the data" on reports; project managers "can view reports of time tracked by other members of a private project".
— [Access rights and privileges](https://support.toggl.com/en/articles/2216605-access-rights-and-privileges)

In both, the tracked person has **no lever at all** over what their manager sees. The lever is always above them.

**Why probably** — and I want to be clear this is my inference, not something a vendor wrote down:

These are billing and payroll tools. The upper node *pays* for the work, so the upper node must be able to audit it; letting the payee decide what the payer sees would make the invoice unauditable. That is a genuine reason, and it partially transfers to us: if the CEO hands work to Sarah and Sarah sets the dial to "status only", the CEO's company-effort clock and their estimation-accuracy analysis — the entire point of OnTrack — go dark for that subtree, and the CEO cannot tell whether it went dark because Sarah is slow or because Sarah is hiding.

I found **no vendor doc naming recipient-controlled upward visibility as an anti-pattern**. Nobody argues against it; nobody built it. Honest read: this is unexplored space, not forbidden space. It is defensible if the *asymmetry is deliberate* — our tool is not a payer/payee tool, it's a personal-time tool where the handee's own effort is arguably their business. But #88 should say that out loud, because the prior art is unanimous the other way and a reader will assume it's an oversight.

**Sharpest concrete objection**: point 5 says company effort = all entries in the subtree. Point 2 says the handee can withhold time. Those two collide. If the dial is "status only", company effort at the container is *unknowable*, not zero — and a rollup that silently reports a smaller number is exactly the Jira Σ trap below. The map needs a "withheld" state distinct from "zero", or company effort stops meaning what point 5 says it means.

---

## 3. Effort vs duration — two clocks, and the naming trap

### Jira: shipped exactly our split, and users still misread it

Jira has `timespent` (this issue) vs `aggregatetimespent` (this issue + sub-tasks), surfaced in the UI as **Time Spent** vs **Σ Time Spent**. That is our individual effort vs company effort.

The trap, from Atlassian's own tracker: the docs said Σ Original Estimate was "the aggregate Original Estimate for an issue's **sub-tasks**", but it actually returns **parent + sub-tasks**. Reporter's example: parent 1w, sub-tasks 1d + 2d → field shows **1w 3d**, not 3d.
— [JRA-31770 "Misleading Description about Σ Original Estimate"](https://jira.atlassian.com/browse/JRA-31770) — **resolved "Won't Do"**.

Two lessons:

- The confusion was never about the *model*. It was about whether the aggregate **includes the node's own value**. Ours does (company effort = all entries in the subtree, including the node's own). We must say so in the label, not the tooltip.
- Atlassian declined to fix even the docs. The ambiguity is now permanent in the world's most-used tracker — meaning users arrive at our tool already unsure what a Σ means.

Also worth knowing: Jira's Σ aggregates **the issue and its sub-tasks** — one level. Epic children are not sub-tasks. Our ADR-0015 rollup is fully recursive, which is *different from Jira*, so borrowing Jira's Σ vocabulary without borrowing its shallowness invites a wrong guess.

### MS Project: the clearest vocabulary, and it validates our container rule

The distinction Project draws is exactly ours:

> "Some summary task values (cost and work) are the total of the subtask values, others (duration and baseline) aren't."

> Duration = "The span of working time for a task, for example 2 days or 3 weeks", "never affected by changes in effort and assignment."
> Effort = "The amount of hours a group member or resource spends on a task."
— [Effort and duration in Project for the web](https://support.microsoft.com/en-us/office/effort-and-duration-in-project-for-the-web-f7740450-1ad8-4628-aef6-1fdca60cc4b6)

**Work/effort rolls up and sums. Duration does not.** If we ever add a duration-like clock, do not sum it.

And, directly on our point 6 ("a container holds work but is never worked"):

> "Avoid assigning resources to summary tasks. Assign them to the subtasks instead, or you might not be able to resolve overallocations."
— [Create and work with subtasks and summary tasks in Project desktop](https://support.microsoft.com/en-us/project/create-and-work-with-subtasks-and-summary-tasks-in-project-desktop)

Project *allows* work on a summary task and spent 25 years telling people not to. The failure it produces is double counting: a resource 75% on a summary and 75% on one of its subtasks reads as **150% allocated** ([MS Project: Linking and/or Assigning Resources to Summary Tasks](https://learn.microsoft.com/en-us/archive/technet-wiki/29569.ms-project-linking-andor-assigning-resources-to-summary-tasks) — TechNet *wiki*, community-editable, so second-tier; the "avoid" guidance above is the primary one).

The recommended workaround on that same page — "create a separate task to delineate management/supervisory support" — **is our point 7 fallback verbatim** (nest a `Handoff Sarah` child and hand that). We reinvented it. Good sign, and worth citing in the ADR so it doesn't read as arbitrary.

Also: summary tasks "cannot be edited directly. If you want to change a summary task, you change the subtasks that make up the summary task" — Project's summary task is non-startable in practice, like our container.

**Our container rule is stronger than Project's**: we make it structurally impossible (non-startable), where Project merely advises. Prior art says the advisory version fails. Keep ours hard.

### German vocabulary (UI is German)

From Microsoft's German docs — these are the terms a German-speaking PM already knows:

- **Aufwand** = effort. "Die Anzahl der Stunden, die ein Gruppenmitglied oder eine Ressource für einen Vorgang aufwendet." — [Aufwand und Dauer in Project für das Web](https://support.microsoft.com/de-de/office/aufwand-und-dauer-in-project-f%C3%BCr-das-web-f7740450-1ad8-4628-aef6-1fdca60cc4b6)
- **Dauer** = duration. "Die Zeitspanne der Arbeitszeit für eine Aufgabe, z. B. 2 Tage oder 3 Wochen."
- **Arbeit** = work (the desktop field name; effort in the scheduling formula).
- **Sammelvorgang** = summary task — i.e. **the established German word for our container**. Literally "collecting task". Non-jargon, self-explaining, already in the domain.
- **Vorgang** = task/activity.

Suggested for the two clocks — *my proposal, not sourced*: **Eigener Aufwand** (individual effort) vs **Gesamtaufwand** (company effort). `Gesamt-` is the standard German aggregate prefix and carries "includes everything below, and this node" better than `Σ` does. Avoid "Firmenaufwand" — company effort is about the subtree, not the legal entity, and Felix's plain-language rule argues against a word that invites the wrong reading. Worth a check with Felix; I'm not a native speaker either.

---

## 4. Partial-tree rendering — how do you root a subtree whose top is hidden?

Three answers exist in the wild:

**a) Re-root it in a flat "shared with me" bucket — Google Drive.** A directly-shared file inside an unreachable parent doesn't render in the hierarchy; it surfaces in *Shared with me*. Caveat from the docs: "Before a folder appears in your 'Shared with me' folder, you must open that folder from an invitation or a link." — [Share folders in Google Drive](https://support.google.com/drive/answer/7166529). This is our point 4 ("your list = your visible roots") under a different name. **Drive's noun for a visible root is "shared with me"; ours is "renders as a project".** Ours is better for our case — a delegated container really is the recipient's project — but only if the recipient can tell it isn't *their* project. Drive keeps the distinction by putting them in separate buckets. We're merging them. That's a deliberate difference; flag it.

**b) Show a tombstone — Drive limited-access folders.** "Users with inherited access ... can see the restricted folder in Drive but can't open it." Metadata is readable via `files.get()`/`files.list()`, but "If you try to list the children of such a folder, the result is always empty." — [Manage folders with limited and expansive access](https://developers.google.com/workspace/drive/api/guides/limited-expansive-access). So: the node exists, is named, is not openable, and its children read as empty rather than as an error. That is a third option we haven't considered for the downward dial — not breadcrumb on/off, but breadcrumb *greyed*.

**c) Hide it entirely — Linear.** Shared non-members simply "can't view or change the team, project, cycle". No tombstone. The issue is just its own root.

---

## 5. The finding that most threatens the spine: narrowing

Our point 3 says visibility narrows in both directions and a viewer sees the **narrowest dial on the path**. Google Drive — the most-deployed hierarchical permission system in existence — explicitly bans that:

> "Inherited permissions cannot be removed or reduced on any item. Instead, these permissions must be adjusted on the parent where they originate or a folder in the hierarchy must enable the limited access setting."
— [Share files, folders, and drives (Drive API)](https://developers.google.com/workspace/drive/api/guides/manage-sharing)

Drive's model:
- default **expansive**: "Every user who has access to a folder also has access to all items inside the folder";
- a child may be granted **more** than it inherits, never less;
- to narrow, you don't set a smaller dial on the child — you flip **limited access** on a folder, which severs inheritance for that subtree: "Only users you directly add to the folder's permissions can open it and access its content."

So Drive's effective access is **max over the paths that reach you**, with limited-access folders deleting paths. Not min. Not narrowest-on-path.

*Honesty note*: the two Drive pages, read through a summarizer, gave me conflicting characterizations (one page's phrasing reads as "most restrictive wins"). The sentence I trust is the quoted one above — "cannot be removed or reduced" — because it's a direct quote from the API guide and it's consistent with the existence of the limited-access feature (which would be unnecessary if you could just narrow a child). If this matters to the ADR, someone should re-read both pages by hand rather than trust this file.

**Why this may not sink us.** Our dials only sit on *handover boundaries*, not on arbitrary nodes. A handover boundary is structurally the same object as Drive's limited-access folder: a designated place where inheritance stops. So we are arguably not doing "reduce on a child" — we're doing "cut at a boundary", which is exactly what Drive tells you to do instead. Our container ≈ Drive's limited-access folder. That reading makes point 3 *compatible* with Drive rather than contradicted by it.

**Why it still needs an answer.** The min-rule is stated in #88 as a general rule over paths ("what a viewer sees of a node = the narrowest dial on the path between them"). Drive's experience says the general min-rule is where hierarchical permission systems go to die — it's the thing they had to remove. Two concrete questions #88 doesn't answer:

- **Multiple paths.** If a viewer can reach a node by two different chains (they hand work to Sarah, and also sit under a container Sarah handed them), min-over-path is ambiguous: min over *which* path? Drive answers max-over-all-paths. We answer... unclear. Our one-hop rule may make multi-path unreachable — but #88 doesn't prove it, and "structurally cannot" claims need proofs, not instincts.
- **Recompute on move.** Drive warns that indirect permissions don't survive re-parenting: "Users who had indirect access to a folder and its contents through access to a parent folder may lose access ... indirect file permissions inherited from parent folder permissions aren't copied." Our tree has moves (ADR-0018's transitions). Moving a node under a different container silently changes who can see it. That interacts with `applyTransition()` and nobody has looked.

---

## What I'd change in #88

Not map-breaking, but the map shouldn't lock without these:

1. **Point 5 vs point 2 collide.** Company effort can't be "all entries in the subtree" *and* withholdable. Add a **withheld ≠ zero** state, or restate point 5.
2. **Point 3 should be restated as "cut at the boundary", not "narrowest on the path".** Same behaviour in our topology, but it's the phrasing that survives prior art, and it maps 1:1 onto Drive's limited-access folder. Then prove the one-hop rule actually makes multi-path unreachable, or say what min-over-paths means.
3. **Add the third downward option**: breadcrumb on / off / **tombstoned** (name visible, not openable, children read empty). Drive ships it; it's cheap; it may be what "the handee sees the hander's own tasks" actually wants.
4. **Say out loud why the upward dial is recipient-owned**, since seven of seven tools do the opposite. If the answer is "we are not a billing tool", that's a fine answer — write it down.
5. **Name the clocks in German now**: `Eigener Aufwand` / `Gesamtaufwand`, container = `Sammelvorgang`. And label whether the aggregate includes the node's own time — that's the exact thing Jira never fixed.
6. **Re-parenting vs windows** is unexamined and belongs on the map's "not yet specified" list.

## Sources

Primary (vendor-owned):
- [Jira — issue security levels & subtasks](https://support.atlassian.com/jira/kb/allow-specific-users-to-view-tasks-and-subtasks-with-security-levels-in-jira/)
- [Jira — permissions overview](https://support.atlassian.com/jira/kb/jira-permissions-general-overview/)
- [JRA-31770 — Misleading Description about Σ Original Estimate](https://jira.atlassian.com/browse/JRA-31770)
- [Linear — Private teams](https://linear.app/docs/private-teams)
- [Linear — changelog, share issues in private teams](https://linear.app/changelog/2026-02-13-advanced-filters-and-share-issues-in-private-teams)
- [Asana — permissions](https://asana.com/resources/asana-tips-permissions)
- [Basecamp — changing what clients can see](https://3.basecamp-help.com/article/693-changing-what-clients-can-see-and-do)
- [Height — sharing & permissions](https://help.height.app/en/articles/3584125-sharing-permissions)
- [Harvest — team permissions](https://support.getharvest.com/hc/en-us/articles/360048687451-Team-permissions)
- [Toggl — access rights and privileges](https://support.toggl.com/en/articles/2216605-access-rights-and-privileges)
- [MS Project — effort and duration](https://support.microsoft.com/en-us/office/effort-and-duration-in-project-for-the-web-f7740450-1ad8-4628-aef6-1fdca60cc4b6) / [German](https://support.microsoft.com/de-de/office/aufwand-und-dauer-in-project-f%C3%BCr-das-web-f7740450-1ad8-4628-aef6-1fdca60cc4b6)
- [MS Project — subtasks and summary tasks](https://support.microsoft.com/en-us/project/create-and-work-with-subtasks-and-summary-tasks-in-project-desktop)
- [Google Drive API — manage sharing](https://developers.google.com/workspace/drive/api/guides/manage-sharing)
- [Google Drive API — limited and expansive access](https://developers.google.com/workspace/drive/api/guides/limited-expansive-access)
- [Google Drive — share folders](https://support.google.com/drive/answer/7166529)

Second-tier, flagged where used:
- [TechNet wiki — resources on summary tasks](https://learn.microsoft.com/en-us/archive/technet-wiki/29569.ms-project-linking-andor-assigning-resources-to-summary-tasks) (community-editable)
- Asana forum threads on subtask/parent visibility (used only as a lead, not a claim)

Not verified:
- Height's behaviour for a subtask under a private parent.
- Whether Linear's one-hop re-share block has exceptions for admins.
- The Drive union-vs-intersection phrasing conflict noted in §5.
