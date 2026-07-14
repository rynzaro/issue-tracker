import { ServiceErrorResponse } from "./serviceUtil";

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

export type TransitionPlan = {
  setCompletedAt: { ids: string[]; value: Date | null };
  setArchivedAt: { ids: string[]; value: Date | null };
  setDeletedAt: { ids: string[]; value: Date | null };
};

const EMPTY_PLAN: TransitionPlan = {
  setCompletedAt: { ids: [], value: null },
  setArchivedAt: { ids: [], value: null },
  setDeletedAt: { ids: [], value: null },
};

// ─── Validation ────────────────────────────────────────────────────────────────

type ValidationError = {
  code: ServiceErrorResponse["error"]["code"];
  message: string;
};
type ValidationResult =
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
  return {
    ...EMPTY_PLAN,
    setCompletedAt: {
      ids: pruneCascade(task.id, descendants, (n) => !!n.completedAt),
      value: new Date(),
    },
  };
}

function buildUncompletePlan(
  task: LineageNode,
  ancestors: LineageNode[],
): TransitionPlan {
  const ids: string[] = [];
  if (task.completedAt) ids.push(task.id);
  for (const a of ancestors) {
    if (a.completedAt) {
      ids.push(a.id);
    } else {
      break; // stop at first uncompleted ancestor (contiguous prefix)
    }
  }
  return {
    ...EMPTY_PLAN,
    setCompletedAt: { ids, value: null },
  };
}

function buildArchivePlan(
  task: LineageNode,
  descendants: LineageNode[],
): TransitionPlan {
  return {
    ...EMPTY_PLAN,
    setArchivedAt: {
      ids: pruneCascade(task.id, descendants, (n) => !!n.archivedAt),
      value: new Date(),
    },
  };
}

function buildUnarchivePlan(
  task: LineageNode,
  ancestors: LineageNode[],
): TransitionPlan {
  const ids: string[] = [];
  if (task.archivedAt) ids.push(task.id);
  for (const a of ancestors) {
    if (a.archivedAt) {
      ids.push(a.id);
    } else {
      break; // stop at first unarchived ancestor (contiguous prefix)
    }
  }
  return {
    ...EMPTY_PLAN,
    setArchivedAt: { ids, value: null },
  };
}

function buildDeletePlan(
  task: LineageNode,
  descendants: LineageNode[],
): TransitionPlan {
  return {
    ...EMPTY_PLAN,
    setDeletedAt: {
      ids: pruneCascade(task.id, descendants, (n) => !!n.deletedAt),
      value: new Date(),
    },
  };
}

function buildUndeletePlan(
  task: LineageNode,
  ancestors: LineageNode[],
): TransitionPlan {
  const ids: string[] = [];
  if (task.deletedAt) ids.push(task.id);
  for (const a of ancestors) {
    if (a.deletedAt) {
      ids.push(a.id);
    } else {
      break; // stop at first non-deleted ancestor (repair contiguous gap only)
    }
  }
  return {
    ...EMPTY_PLAN,
    setDeletedAt: { ids, value: null },
  };
}
