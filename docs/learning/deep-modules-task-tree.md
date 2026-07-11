# Learning note — Deep modules, taught by the task tree

**Case study:** the two task-tree builders in `lib/services/project.service.ts` (2026-07-10, branch `main-vibe`).
**Vocabulary source:** `.claude/skills/codebase-design/SKILL.md` — *module, interface, implementation, depth, seam, adapter, leverage, locality, deletion test*. This note applies that vocabulary to code I wrote; recite from the **Recall** lines.

Line refs are point-in-time (2026-07-10) — re-verify before relying on them.

---

## 1 · A shallow module by accident — depth lives in the interface

**The principle.** A module is *deep* when a lot of behaviour sits behind a small interface. Depth is measured at the interface, not by how the code looks inside. Leverage = behaviour a caller gets per unit of interface they must learn.

**What the code did.** `getProjectTaskTree` (`project.service.ts:250`) fuses I/O (fetch project + timer), auth, and a pure computation (map → link → post-order pass deriving status, `hasActiveDescendant`, time rollup, estimate overflow). The pure part has **no interface of its own** — it is trapped inside the function.

**The consequence.** When the archive page needed trees, the existing logic wasn't callable — nothing exposed it without the wrong I/O and auth attached. So a second builder appeared: `buildTaskNodeTree` (`:348`), same shape, re-implemented.

**The superior shape.** One pure module — `buildTaskTree(rows, opts)` (suggested home `lib/services/taskTreeAssembly.ts`, precedent: `taskHierarchyPolicy.ts`) — hiding the whole pipeline. Both service functions become thin callers: fetch rows, call the module.

**Why it wins.** The second (and any future) caller becomes a one-line consumer instead of a re-implementation. Duplication is usually not laziness — it's the *symptom of a missing interface*.

**Recall:** where is depth measured, and what was the tell that an interface was missing?

## 2 · Information leakage across a seam

**The principle** (Parnas, information hiding). When the same knowledge must exist in two modules, the design leaks. Compute where the information lives; carry the **answer** across the seam, not a lossy summary.

**What the code did.** The server's post-order pass knew *which* descendant was active and *since when* — then shipped only `hasActiveDescendant: boolean` across the server→client seam. The client (`tasks.tsx:86-91`) ran a **second recursive traversal** (`getActiveDescendantStartedAt`, `lib/util.ts:120`) at render time to reconstruct the Date the server threw away.

Smaller-scale same disease: `isTimerActive = hasActiveDescendant || status === "IN_PROGRESS"` defined at `tasks.tsx:80`, re-derived inline at `:151-156` and `:166` — interface knowledge restated per call site.

**The superior shape.** One extra field on `TaskNode` (ancestors carry the active descendant's start time, set during the pass that already visits those children). The client only renders; both recursive helpers in `lib/util.ts:106-131` get deleted.

**Why it wins.** One field deletes an entire client-side algorithm, and "how to find the active timer in a tree" is knowledge owned by exactly one module.

**Recall:** what's the rule for what crosses a seam, and what was the boolean's sin?

## 3 · Drift is the proof that duplication costs

**The principle.** Locality: with one implementation, a policy question is asked and answered once, deliberately. With two, it gets answered twice by accident — differently.

**What the code did.** The two builders already disagreed:

- Status: derived in the post-order pass (active path, `:307-311`) vs. set inline at node creation (archive path, `:361`).
- Orphans (parentId outside the fetched row set): **silently dropped** in the active path (`:296` — the `?.` swallows the push and the node never reaches `roots`; a corrupt row = task vanishes from the UI with no error) vs. **promoted to root** in the archive path (`:372` — load-bearing by design there: an archived subtree's root always points at a still-active parent).

Nobody *decided* the active tree should hide orphaned tasks. It's an accident of the copy.

**The deletion test** (how to judge a module): imagine deleting `buildTaskNodeTree` — its complexity immediately reappears in three callers. The behaviour is real and earning its keep; only the *second copy of the knowledge* is waste.

**Recall:** name the two live drifts, and why the orphan one is dangerous.

## 4 · The interface is the test surface

**The principle.** Callers and tests cross the same seam. If tests need mocks to reach pure logic, the module boundary is in the wrong place. And when a deeper module appears: **replace, don't layer** — port old tests to the new interface and delete them from the old spot.

**What the code did.** `tests/unit/services/project.service.test.ts` mocks Prisma *and* `activeTask.service` just to exercise pure tree math. The archive builder has **zero tests** — because testing it means paying the same mocking ceremony again, and nobody did.

**The superior shape.** Pure module ⇒ tests are fixture-rows-in, tree-out, no mocks. The archive path *inherits* the already-proven rollup/activity tests instead of shipping untested near-copies. Service tests shrink to what genuinely belongs to the service's interface: auth, NOT_FOUND, timer-fetch failure.

This is Bernhardt's **functional core, imperative shell**: pure decisions inside, thin I/O wrapper outside.

**Recall:** what smell tells you the boundary is misplaced, and what does "replace, don't layer" forbid?

## 5 · Design questions dissolve into domain invariants

**The principle.** Interface options often aren't taste decisions — hunt for the invariant that makes one option simply *true*.

**What happened.** Open question: does the module need an archive *mode*? Verification answered it: COMPLETE / ARCHIVE / DELETE all reject transactionally if any descendant holds a timer (`task.service.ts:378, 507, 287`), and the transition plans cascade down / repair the ancestor chain up (`taskHierarchyPolicy.ts`). So archived trees are timer-free **by construction** — run activity derivation unconditionally and it correctly derives `false`/`null` for archive rows. The "mode" was never a behaviour difference, only an input difference (`activeTimer` present or not).

Note: `taskHierarchyPolicy.ts` is this whole pattern already executed once — a pure policy module extracted from a service, tested at its own interface (ADR-0018). The tree assembly is the same move, one seam over.

**Recall:** what invariant dissolved the "archive mode" question, and where is it enforced?

---

## Open judgment calls (not derivable from principle — mine to decide)

1. **Interface shape:** one `buildTaskTree(rows, opts)` (deeper: the mode dissolves into an input, per §5) vs. two named entry points `buildActiveTaskTree` / `buildArchiveTaskTree` (self-documenting, room to diverge — but risks re-encoding the duplication at the interface).
2. **Orphan policy:** promote-to-root always (makes corruption *visible*) · keep the split via a flag (preserves exact behaviour, carries a mode) · promote + log (visible **and** flagged). Note: promote is a behaviour change for the active path only in the corrupt-data case.
3. **Field unification:** new `activeDescendantStartedAt` beside `activeTimerStartedAt` (two crisp meanings) vs. one unified `activityStartedAt` on active node *and* ancestors (smaller interface; "this node owns the timer" then read from `status === "IN_PROGRESS"` alone). Renaming is cheap right now — only `tasks.tsx` and the two soon-dead util helpers consume the field.
4. Once decided → record as an ADR in `docs/adr/` (one-paragraph house style), since orphan policy and the field contract are interface promises the UI relies on.

## Going deeper — reading

- **Ousterhout, *A Philosophy of Software Design*** — deep modules, information leakage, "different layer, different abstraction" (§2's boolean is his textbook example).
- **Parnas, "On the Criteria to Be Used in Decomposing Systems into Modules" (1972)** — short paper, origin of information hiding: decompose by what each module *hides*, not by execution steps.
- **Gary Bernhardt, "Boundaries"** (talk, ~30 min) — functional core / imperative shell; why §4's mocks are the smell.
- **Feathers, *Working Effectively with Legacy Code*** — seams; source of the vocabulary.

## Related material

- Sibling briefs from the same architecture review (tmp, may be cleaned): `/var/folders/yc/4bpgyb597vl499b9cwcs91j80000gn/T/handoff-arch-deepening-20260710/` — 02 hierarchy-transition runner (top recommendation), 03 server-action wrapper, 04 elapsed-time display, 05 dead-island deletion, 06 Prisma fake adapter. The step-by-step implementation write-up for this candidate lived there too; everything durable from it is folded into this note.
