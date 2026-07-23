// ─── Types ─────────────────────────────────────────────────────────────────────

export type TransitionKind =
  | "COMPLETE"
  | "UNCOMPLETE"
  | "ARCHIVE"
  | "UNARCHIVE"
  | "DELETE"
  | "UNDELETE";

export type LineageNode = {
  id: string;
  parentId: string | null;
  completedAt: Date | null;
  archivedAt: Date | null;
  deletedAt: Date | null;
};

/** The three date columns a hierarchy transition can write. */
export type TransitionState = "completedAt" | "archivedAt" | "deletedAt";

const STATES = ["completedAt", "archivedAt", "deletedAt"] as const;

/**
 * How strongly a state holds a task: **delete > archive > complete** (#57).
 *
 * One order runs both directions. Forward kinds cascade down through states
 * strictly weaker than their own and stop at equal-or-stronger: the stronger
 * state already covers everything below it, and its date is estimation
 * evidence worth keeping (#44). Backward kinds read the same order upward,
 * inheriting the strictly weaker states their ancestors still hold (#63).
 *
 * Illegal moves fall out of it too — uncompleting through an archived ancestor
 * asks to leave a task in a state its ancestor's stronger one forbids.
 */
const STRENGTH: Record<TransitionState, number> = {
  completedAt: 1,
  archivedAt: 2,
  deletedAt: 3,
};

/** Whether the node is held by `state` or by anything stronger than it. */
function heldBySameOrStronger(node: LineageNode, state: TransitionState): boolean {
  return STATES.some(
    (s) => STRENGTH[s] >= STRENGTH[state] && node[s] !== null,
  );
}

/** Set `state` to `value` on every task in `ids`. */
export type PlanWrite = {
  state: TransitionState;
  ids: string[];
  value: Date | null;
};

/**
 * One entry for the audit ledger: this task changed, at this time, because of
 * this transition. `causedBy` names the task that caused the change: the task
 * the user actually acted on for cascade and repair events, or the ancestor
 * whose state was taken on for inherit events. Only the acted-on target
 * itself carries no `causedBy` (ADR-0020).
 *
 * `kind` stays domain vocabulary — mapping it to a stored event type is the
 * service's job, which is what keeps this module free of prisma (#59).
 */
export type PlanEvent = {
  kind: TransitionKind;
  taskId: string;
  at: Date;
  causedBy?: string;
};

/**
 * Everything a transition changes, as flat lists the executor replays in
 * order — it needs no knowledge of the kind that produced it (#57, #60).
 *
 * A plan lists only what it actually does: a kind with nothing to do plans no
 * writes and no events. The same state may appear in more than one write with
 * different values, which is how #63 backdates some ids while clearing others.
 */
export type TransitionPlan = {
  writes: PlanWrite[];
  events: PlanEvent[];
};

/** One write, or none at all when it would touch no task. */
function writeOne(
  state: TransitionState,
  ids: string[],
  value: Date | null,
): PlanWrite[] {
  return ids.length > 0 ? [{ state, ids, value }] : [];
}

/**
 * The state a kind is *about* — the flag it sets or clears on the target. Both
 * directions of a pair share one state, since they move along the same axis.
 *
 * Only writes to this state are the transition's own act. A write to any other
 * state is a repair the transition makes to keep the tree legal (#63's
 * backdated inherits) — still a state change, so it gets its own event too,
 * planned where the repair is decided (`inheritWeakerStates`).
 *
 * Exported so a caller can tell the two apart in a plan — what the user asked
 * for, against what had to be repaired around it (#64).
 */
export const OWN_STATE: Record<TransitionKind, TransitionState> = {
  COMPLETE: "completedAt",
  UNCOMPLETE: "completedAt",
  ARCHIVE: "archivedAt",
  UNARCHIVE: "archivedAt",
  DELETE: "deletedAt",
  UNDELETE: "deletedAt",
};

/**
 * The forward kind that sets each state — `OWN_STATE` read backwards, keeping
 * only the setting direction. An inherit event uses it: a task taking on
 * `archivedAt` was archived, whichever transition made it happen.
 */
const KIND_THAT_SETS: Record<TransitionState, TransitionKind> = {
  completedAt: "COMPLETE",
  archivedAt: "ARCHIVE",
  deletedAt: "DELETE",
};

/**
 * One event per task the transition's own-state write touches.
 *
 * Forward kinds stamp a date and the event carries it. Backward kinds store
 * null, so the event carries the time of the act instead — the stored fact and
 * the audit trail are allowed to differ (#57).
 */
function planEvents(
  kind: TransitionKind,
  task: LineageNode,
  writes: PlanWrite[],
): PlanEvent[] {
  const own = writes.find((w) => w.state === OWN_STATE[kind]);
  if (!own) return [];
  const at = own.value ?? new Date();
  return own.ids.map((id) => ({
    kind,
    taskId: id,
    at,
    ...(id === task.id ? {} : { causedBy: task.id }),
  }));
}

// ─── Validation ────────────────────────────────────────────────────────────────

/**
 * The policy's own error type — deliberately not the service error shape, so
 * this domain module stays importable from client code (#57, #59).
 *
 * The two codes answer different questions (#14):
 *
 * - `TRANSITION_INVALID` — the tree is sound; this move is not allowed on it.
 *   Reachable through ordinary use, and the user's to fix: complete a task,
 *   archive its parent so the cascade takes the task with it, then try to
 *   uncomplete the task. Nothing is wrong; the answer is simply no.
 * - `UNEXPECTED_ERROR` — the tree itself is wrong. Only the gap checks return
 *   it: a state gap in an ancestor chain breaks invariant 5, which no sequence
 *   of transitions can produce. Seeing it means the data is broken, not the
 *   request.
 *
 * They were one code, so a refused click and a corrupt tree were told apart by
 * reading the message.
 */
export type TransitionErrorCode = "TRANSITION_INVALID" | "UNEXPECTED_ERROR";
export type ValidationError = {
  code: TransitionErrorCode;
  message: string;
  /**
   * The task the rule tripped on, when the rule was about a particular one.
   * `message` is the domain's own wording; a caller that has to name the task
   * to a user looks it up by this id and says it in its own words (#64).
   */
  taskId?: string;
};
export type ValidationResult =
  | { valid: true }
  | { valid: false; error: ValidationError };

function fail(
  code: ValidationError["code"],
  message: string,
  taskId?: string,
): ValidationResult {
  return {
    valid: false,
    error: { code, message, ...(taskId !== undefined ? { taskId } : {}) },
  };
}

function ok(): ValidationResult {
  return { valid: true };
}

/**
 * Self-state legality: whether the task's own flags permit this transition.
 * This is the only judge — callers fetch by id and ask, rather than filtering
 * a wrong-state task out and calling it missing (#62).
 */
function validateSelfState(
  kind: TransitionKind,
  task: LineageNode,
): ValidationResult {
  if (task.deletedAt && kind !== "UNDELETE")
    return fail("TRANSITION_INVALID", "Task is deleted", task.id);
  switch (kind) {
    case "COMPLETE":
      if (task.archivedAt) return fail("TRANSITION_INVALID", "Task is archived", task.id);
      if (task.completedAt)
        return fail("TRANSITION_INVALID", "Task is already completed", task.id);
      return ok();
    case "UNCOMPLETE":
      if (task.archivedAt) return fail("TRANSITION_INVALID", "Task is archived", task.id);
      if (!task.completedAt)
        return fail("TRANSITION_INVALID", "Task is not completed", task.id);
      return ok();
    case "ARCHIVE":
      if (task.archivedAt)
        return fail("TRANSITION_INVALID", "Task is already archived", task.id);
      return ok();
    case "UNARCHIVE":
      if (!task.archivedAt)
        return fail("TRANSITION_INVALID", "Task is not archived", task.id);
      return ok();
    case "UNDELETE":
      if (!task.deletedAt)
        return fail("TRANSITION_INVALID", "Task is not deleted", task.id);
      return ok();
    case "DELETE":
      return ok();
  }
}

/**
 * Validate whether a hierarchy transition is legal given the task's own state
 * and the ancestor chain. `ancestors` is ordered nearest-parent → root.
 */
export function validateTransition(
  kind: TransitionKind,
  task: LineageNode,
  ancestors: LineageNode[],
): ValidationResult {
  const self = validateSelfState(kind, task);
  if (!self.valid) return self;
  switch (kind) {
    case "COMPLETE":
      return validateComplete(ancestors);
    case "UNCOMPLETE":
      return validateUncomplete(task, ancestors);
    case "ARCHIVE":
      return validateArchive(ancestors);
    case "UNARCHIVE":
      return validateUnarchive(ancestors);
    case "DELETE":
      return validateDelete(ancestors);
    case "UNDELETE":
      return validateUndelete(ancestors);
  }
}

function validateComplete(ancestors: LineageNode[]): ValidationResult {
  for (const a of ancestors) {
    if (a.deletedAt)
      return fail("TRANSITION_INVALID", "Ancestor task is deleted", a.id);
    if (a.archivedAt)
      return fail("TRANSITION_INVALID", "Ancestor task is archived", a.id);
  }
  // Completion gap check: no uncompleted ancestor may sit between completed ancestors
  let seenUncompleted = false;
  for (const a of ancestors) {
    if (!a.completedAt) {
      seenUncompleted = true;
    } else if (seenUncompleted) {
      return fail("UNEXPECTED_ERROR", "Invalid ancestor completion chain", a.id);
    }
  }
  return ok();
}

function validateUncomplete(
  task: LineageNode,
  ancestors: LineageNode[],
): ValidationResult {
  for (const a of ancestors) {
    if (a.deletedAt)
      return fail("TRANSITION_INVALID", "Ancestor task is deleted", a.id);
    if (a.archivedAt)
      return fail("TRANSITION_INVALID", "Ancestor task is archived", a.id);
  }
  // Completion gap check: after the first uncompleted ancestor, no higher ancestor may be completed
  let reachedUncompleted = false;
  for (const a of ancestors) {
    if (a.completedAt) {
      if (reachedUncompleted) {
        return fail("UNEXPECTED_ERROR", "Invalid ancestor completion chain", a.id);
      }
    } else {
      reachedUncompleted = true;
    }
  }
  return ok();
}

function validateArchive(ancestors: LineageNode[]): ValidationResult {
  for (const a of ancestors) {
    if (a.deletedAt)
      return fail("TRANSITION_INVALID", "Ancestor task is deleted", a.id);
    if (a.archivedAt)
      return fail("TRANSITION_INVALID", "Ancestor task is archived", a.id);
  }
  return ok();
}

function validateUnarchive(ancestors: LineageNode[]): ValidationResult {
  for (const a of ancestors) {
    if (a.deletedAt)
      return fail("TRANSITION_INVALID", "Ancestor task is deleted", a.id);
  }
  // Archive gap check: after first unarchived ancestor, no higher ancestor may be archived
  let reachedUnarchived = false;
  for (const a of ancestors) {
    if (a.archivedAt) {
      if (reachedUnarchived) {
        return fail("UNEXPECTED_ERROR", "Invalid ancestor archive chain", a.id);
      }
    } else {
      reachedUnarchived = true;
    }
  }
  return ok();
}

function validateDelete(ancestors: LineageNode[]): ValidationResult {
  for (const a of ancestors) {
    if (a.deletedAt)
      return fail("TRANSITION_INVALID", "Ancestor task is deleted", a.id);
  }
  return ok();
}

function validateUndelete(ancestors: LineageNode[]): ValidationResult {
  // Deletion gap check: after first undeleted ancestor, no higher ancestor may be deleted
  let reachedUndeleted = false;
  for (const a of ancestors) {
    if (a.deletedAt) {
      if (reachedUndeleted) {
        return fail("UNEXPECTED_ERROR", "Invalid ancestor deletion chain", a.id);
      }
    } else {
      reachedUndeleted = true;
    }
  }
  return ok();
}

// ─── Plan Building ─────────────────────────────────────────────────────────────

/**
 * Downward-cascade stop rule (#44), read through the strength order.
 *
 * A descendant already held by `state` — or by anything stronger — keeps its
 * original date: it is not re-stamped, and the walk does not continue below
 * it. The no-gaps invariant (CONTEXT.md invariant 5) means everything under it
 * is at least as strongly held, so nothing is missed. The dates are estimation
 * evidence; overwriting them destroys it.
 *
 * The order does the deciding here, so the caller may hand over the whole
 * subtree and does not have to pre-filter it into agreement (#62).
 */
function pruneCascade(
  taskId: string,
  descendants: LineageNode[],
  state: TransitionState,
): string[] {
  const byId = new Map(descendants.map((n) => [n.id, n]));
  const childrenMap = new Map<string, string[]>();
  for (const n of descendants) {
    if (n.parentId) {
      if (!childrenMap.has(n.parentId)) childrenMap.set(n.parentId, []);
      childrenMap.get(n.parentId)!.push(n.id);
    }
  }

  const ids: string[] = [];
  const queue = [taskId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const node = byId.get(current);
    if (!node || heldBySameOrStronger(node, state)) continue; // stop: keep its date, skip its subtree
    ids.push(current);
    queue.push(...(childrenMap.get(current) ?? []));
  }
  return ids;
}

/**
 * The task plus the unbroken run of ancestors already in the same state,
 * nearest parent outward. A backward transition clears exactly this run: it
 * stops at the first ancestor not in the state, so an ancestor sitting beyond
 * a gap is left alone. Whether such a gap is legal at all is validation's
 * business, not the plan's.
 */
function ownStateRun(
  task: LineageNode,
  ancestors: LineageNode[],
  state: TransitionState,
): string[] {
  const ids: string[] = [];
  if (task[state]) ids.push(task.id);
  for (const a of ancestors) {
    if (!a[state]) break;
    ids.push(a.id);
  }
  return ids;
}

/**
 * Build the set of mutations required for a hierarchy transition.
 *
 * `task` is the target. `ancestors` ordered nearest-parent → root.
 * `descendants` is the task + descendant nodes (only needed for downward
 * cascades); downward plans prune via the stop rule above.
 */
export function buildTransitionPlan(
  kind: TransitionKind,
  task: LineageNode,
  ancestors: LineageNode[],
  descendants: LineageNode[] = [],
): TransitionPlan {
  const { writes, events: inheritEvents } = buildWrites(
    kind,
    task,
    ancestors,
    descendants,
  );
  return { writes, events: [...planEvents(kind, task, writes), ...inheritEvents] };
}

/**
 * The writes, plus the events only the write-building knows about: inherit
 * events name the ancestor a state came from, and `inheritWeakerStates` is
 * the only place that knows the source. Own-act events are planned from the
 * finished writes in `planEvents`.
 */
function buildWrites(
  kind: TransitionKind,
  task: LineageNode,
  ancestors: LineageNode[],
  descendants: LineageNode[],
): TransitionPlan {
  switch (kind) {
    case "COMPLETE":
      return cascade("completedAt", task, descendants);
    case "ARCHIVE":
      return cascade("archivedAt", task, descendants);
    case "DELETE":
      return cascade("deletedAt", task, descendants);
    case "UNCOMPLETE":
      return repair("completedAt", task, ancestors);
    case "UNARCHIVE":
      return repair("archivedAt", task, ancestors);
    case "UNDELETE":
      return repair("deletedAt", task, ancestors);
  }
}

/**
 * Forward kinds: stamp the state on the target and every descendant below it
 * that is not already in it, all sharing one date.
 */
function cascade(
  state: TransitionState,
  task: LineageNode,
  descendants: LineageNode[],
): TransitionPlan {
  const ids = pruneCascade(task.id, descendants, state);
  return { writes: writeOne(state, ids, new Date()), events: [] };
}

/**
 * Backward kinds: clear the state on the target and the unbroken run of
 * ancestors that share it, so no task is left below one still in that state.
 *
 * Clearing it also removes the cover it gave. A task parked under a stronger
 * state is allowed to sit outside the weaker ones its ancestors hold — the
 * forward cascade stopped at it and kept its date (#44). Take the stronger
 * state away and that becomes a gap the tree forbids (invariant 5), so the
 * repaired tasks take those weaker states on, backdated to the ancestor's own
 * date rather than stamped with now (#57, #63).
 */
function repair(
  state: TransitionState,
  task: LineageNode,
  ancestors: LineageNode[],
): TransitionPlan {
  const ids = ownStateRun(task, ancestors, state);
  if (ids.length === 0) return { writes: [], events: [] };
  const inherited = inheritWeakerStates(state, ids, [task, ...ancestors]);
  return {
    writes: [{ state, ids, value: null }, ...inherited.writes],
    events: inherited.events,
  };
}

/**
 * What the repaired tasks must take on from the ancestors above them.
 *
 * Reads the chain from the root down, carrying each weaker state's date as far
 * as it applies. A task that holds something stronger is already covered and
 * takes on nothing; a task whose parent does not hold the state has nothing to
 * take. Strongest state first, so a cover pulled in on one pass is known to
 * the next.
 *
 * Each state taken on is a change of its own, so it also gets an event: the
 * forward kind that sets the state, caused by the ancestor the state came
 * from (#54, ADR-0020). The write backdates to the source's date; the event
 * carries `now`, because that is when it happened (#57). Only this function
 * knows which ancestor supplied a date, so the events are planned here.
 *
 * `chain` runs deepest → root; `clearedIds` are the tasks losing `cleared`.
 */
function inheritWeakerStates(
  cleared: TransitionState,
  clearedIds: string[],
  chain: LineageNode[],
): TransitionPlan {
  const repaired = new Set(clearedIds);
  const now = new Date();

  // How each task in the chain stands once the transition has run: the state
  // it is losing is gone, and anything it takes on below is added as we go.
  const after = new Map<string, Record<TransitionState, Date | null>>(
    chain.map((n) => [
      n.id,
      {
        completedAt: n.completedAt,
        archivedAt: n.archivedAt,
        deletedAt: n.deletedAt,
        ...(repaired.has(n.id) ? { [cleared]: null } : {}),
      },
    ]),
  );

  const weaker = STATES.filter((s) => STRENGTH[s] < STRENGTH[cleared]).sort(
    (a, b) => STRENGTH[b] - STRENGTH[a],
  );

  const writes: PlanWrite[] = [];
  const events: PlanEvent[] = [];
  for (const state of weaker) {
    const taken: { id: string; value: Date; from: string }[] = [];
    let source: { value: Date; from: string } | null = null;

    for (const node of [...chain].reverse()) {
      const held = after.get(node.id)!;
      if (held[state]) {
        // a task that holds it becomes the source below
        source = { value: held[state], from: node.id };
      } else if (!repaired.has(node.id)) {
        source = null; // an untouched task without it breaks the run
      } else if (source && !coveredByStronger(held, state)) {
        held[state] = source.value;
        taken.push({ id: node.id, ...source });
      }
    }

    // Each task takes the date of the nearest source above it, and those can
    // differ down one chain — hence one write per distinct date (#60).
    for (const value of new Set(taken.map((t) => t.value))) {
      writes.push({
        state,
        ids: taken.filter((t) => t.value === value).map((t) => t.id),
        value,
      });
    }

    // Two sources can hold the same date, so the event's `causedBy` comes
    // from the tracked source id, never from grouping dates back apart.
    for (const t of taken) {
      events.push({
        kind: KIND_THAT_SETS[state],
        taskId: t.id,
        at: now,
        causedBy: t.from,
      });
    }
  }
  return { writes, events };
}

/** Whether anything the task holds outranks `state`, making it unnecessary. */
function coveredByStronger(
  held: Record<TransitionState, Date | null>,
  state: TransitionState,
): boolean {
  return STATES.some((s) => STRENGTH[s] > STRENGTH[state] && held[s] !== null);
}
