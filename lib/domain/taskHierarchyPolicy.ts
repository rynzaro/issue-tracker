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

/** Set `state` to `value` on every task in `ids`. */
export type PlanWrite = {
  state: TransitionState;
  ids: string[];
  value: Date | null;
};

/**
 * Everything a transition changes, as a flat list the executor replays in
 * order — it needs no knowledge of the kind that produced it (#57, #60).
 *
 * A plan lists only what it actually writes: a kind with nothing to do plans
 * no writes at all. The same state may appear more than once with different
 * values, which is how #63 backdates some ids while clearing others.
 */
export type TransitionPlan = {
  writes: PlanWrite[];
};

const EMPTY_PLAN: TransitionPlan = { writes: [] };

/** A plan of one write, dropped entirely when it would touch no task. */
function planWrite(
  state: TransitionState,
  ids: string[],
  value: Date | null,
): TransitionPlan {
  return ids.length > 0 ? { writes: [{ state, ids, value }] } : EMPTY_PLAN;
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
 * Downward-cascade stop rule (#44): a descendant already in the target state
 * keeps its original date — it is not re-stamped, and the walk does not
 * continue below it. The no-gaps invariant (CONTEXT.md invariant 5) means
 * everything below it is already in the target state, so nothing is missed.
 * The dates are estimation evidence; overwriting them destroys it.
 */
function pruneCascade(
  taskId: string,
  descendants: LineageNode[],
  inTargetState: (n: LineageNode) => boolean,
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
    if (!node || inTargetState(node)) continue; // stop: keep its date, skip its subtree
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
  inState: (n: LineageNode) => boolean,
): string[] {
  const ids: string[] = [];
  if (inState(task)) ids.push(task.id);
  for (const a of ancestors) {
    if (!inState(a)) break;
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
  switch (kind) {
    case "COMPLETE":
      return buildCompletePlan(task, descendants);
    case "UNCOMPLETE":
      return buildUncompletePlan(task, ancestors);
    case "ARCHIVE":
      return buildArchivePlan(task, descendants);
    case "UNARCHIVE":
      return buildUnarchivePlan(task, ancestors);
    case "DELETE":
      return buildDeletePlan(task, descendants);
    case "UNDELETE":
      return buildUndeletePlan(task, ancestors);
  }
}

function buildCompletePlan(
  task: LineageNode,
  descendants: LineageNode[],
): TransitionPlan {
  const ids = pruneCascade(task.id, descendants, (n) => !!n.completedAt);
  return planWrite("completedAt", ids, new Date());
}

function buildUncompletePlan(
  task: LineageNode,
  ancestors: LineageNode[],
): TransitionPlan {
  const ids = ownStateRun(task, ancestors, (n) => !!n.completedAt);
  return planWrite("completedAt", ids, null);
}

function buildArchivePlan(
  task: LineageNode,
  descendants: LineageNode[],
): TransitionPlan {
  const ids = pruneCascade(task.id, descendants, (n) => !!n.archivedAt);
  return planWrite("archivedAt", ids, new Date());
}

function buildUnarchivePlan(
  task: LineageNode,
  ancestors: LineageNode[],
): TransitionPlan {
  const ids = ownStateRun(task, ancestors, (n) => !!n.archivedAt);
  return planWrite("archivedAt", ids, null);
}

function buildDeletePlan(
  task: LineageNode,
  descendants: LineageNode[],
): TransitionPlan {
  const ids = pruneCascade(task.id, descendants, (n) => !!n.deletedAt);
  return planWrite("deletedAt", ids, new Date());
}

function buildUndeletePlan(
  task: LineageNode,
  ancestors: LineageNode[],
): TransitionPlan {
  const ids = ownStateRun(task, ancestors, (n) => !!n.deletedAt);
  return planWrite("deletedAt", ids, null);
}
