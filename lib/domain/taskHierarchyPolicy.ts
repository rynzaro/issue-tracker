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
 * this transition. `causedBy` names the task the user actually acted on, and
 * is set on every task except that target (ADR-0020).
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
 * Only writes to this state are the transition's own act, so only they are
 * worth an event. A write to any other state is a side effect the transition
 * makes to keep the tree legal (#63's backdated inherits), and stays silent.
 */
const OWN_STATE: Record<TransitionKind, TransitionState> = {
  COMPLETE: "completedAt",
  UNCOMPLETE: "completedAt",
  ARCHIVE: "archivedAt",
  UNARCHIVE: "archivedAt",
  DELETE: "deletedAt",
  UNDELETE: "deletedAt",
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
 * this domain module stays importable from client code (#57, #59). Splitting
 * a dedicated TRANSITION_INVALID code out of UNEXPECTED_ERROR is #14.
 */
export type TransitionErrorCode = "UNEXPECTED_ERROR";
export type ValidationError = {
  code: TransitionErrorCode;
  message: string;
};
export type ValidationResult =
  | { valid: true }
  | { valid: false; error: ValidationError };

function fail(
  code: ValidationError["code"],
  message: string,
): ValidationResult {
  return { valid: false, error: { code, message } };
}

function ok(): ValidationResult {
  return { valid: true };
}

/**
 * Self-state legality: whether the task's own flags permit this transition.
 * Services additionally filter their fetches (e.g. `deletedAt: null`) for
 * visibility and NOT_FOUND masking; legality itself is judged here.
 */
function validateSelfState(
  kind: TransitionKind,
  task: LineageNode,
): ValidationResult {
  if (task.deletedAt && kind !== "UNDELETE")
    return fail("UNEXPECTED_ERROR", "Task is deleted");
  switch (kind) {
    case "COMPLETE":
      if (task.archivedAt) return fail("UNEXPECTED_ERROR", "Task is archived");
      if (task.completedAt)
        return fail("UNEXPECTED_ERROR", "Task is already completed");
      return ok();
    case "UNCOMPLETE":
      if (task.archivedAt) return fail("UNEXPECTED_ERROR", "Task is archived");
      if (!task.completedAt)
        return fail("UNEXPECTED_ERROR", "Task is not completed");
      return ok();
    case "ARCHIVE":
      if (task.archivedAt)
        return fail("UNEXPECTED_ERROR", "Task is already archived");
      return ok();
    case "UNARCHIVE":
      if (!task.archivedAt)
        return fail("UNEXPECTED_ERROR", "Task is not archived");
      return ok();
    case "UNDELETE":
      if (!task.deletedAt)
        return fail("UNEXPECTED_ERROR", "Task is not deleted");
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
      return fail("UNEXPECTED_ERROR", "Ancestor task is deleted");
    if (a.archivedAt)
      return fail("UNEXPECTED_ERROR", "Ancestor task is archived");
  }
  // Completion gap check: no uncompleted ancestor may sit between completed ancestors
  let seenUncompleted = false;
  for (const a of ancestors) {
    if (!a.completedAt) {
      seenUncompleted = true;
    } else if (seenUncompleted) {
      return fail("UNEXPECTED_ERROR", "Invalid ancestor completion chain");
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
      return fail("UNEXPECTED_ERROR", "Ancestor task is deleted");
    if (a.archivedAt)
      return fail("UNEXPECTED_ERROR", "Ancestor task is archived");
  }
  // Completion gap check: after the first uncompleted ancestor, no higher ancestor may be completed
  let reachedUncompleted = false;
  for (const a of ancestors) {
    if (a.completedAt) {
      if (reachedUncompleted) {
        return fail("UNEXPECTED_ERROR", "Invalid ancestor completion chain");
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
      return fail("UNEXPECTED_ERROR", "Ancestor task is deleted");
    if (a.archivedAt)
      return fail("UNEXPECTED_ERROR", "Ancestor task is archived");
  }
  return ok();
}

function validateUnarchive(ancestors: LineageNode[]): ValidationResult {
  for (const a of ancestors) {
    if (a.deletedAt)
      return fail("UNEXPECTED_ERROR", "Ancestor task is deleted");
  }
  // Archive gap check: after first unarchived ancestor, no higher ancestor may be archived
  let reachedUnarchived = false;
  for (const a of ancestors) {
    if (a.archivedAt) {
      if (reachedUnarchived) {
        return fail("UNEXPECTED_ERROR", "Invalid ancestor archive chain");
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
      return fail("UNEXPECTED_ERROR", "Ancestor task is deleted");
  }
  return ok();
}

function validateUndelete(ancestors: LineageNode[]): ValidationResult {
  // Deletion gap check: after first undeleted ancestor, no higher ancestor may be deleted
  let reachedUndeleted = false;
  for (const a of ancestors) {
    if (a.deletedAt) {
      if (reachedUndeleted) {
        return fail("UNEXPECTED_ERROR", "Invalid ancestor deletion chain");
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
  const writes = buildWrites(kind, task, ancestors, descendants);
  return { writes, events: planEvents(kind, task, writes) };
}

function buildWrites(
  kind: TransitionKind,
  task: LineageNode,
  ancestors: LineageNode[],
  descendants: LineageNode[],
): PlanWrite[] {
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
): PlanWrite[] {
  const ids = pruneCascade(task.id, descendants, state);
  return writeOne(state, ids, new Date());
}

/**
 * Backward kinds: clear the state on the target and the unbroken run of
 * ancestors that share it, so no task is left below one still in that state.
 */
function repair(
  state: TransitionState,
  task: LineageNode,
  ancestors: LineageNode[],
): PlanWrite[] {
  const ids = ownStateRun(task, ancestors, state);
  return writeOne(state, ids, null);
}
