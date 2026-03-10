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
 * Validate whether a hierarchy transition is legal given the ancestor chain.
 * `ancestors` is ordered nearest-parent → root.
 */
export function validateTransition(
  kind: TransitionKind,
  task: LineageNode,
  ancestors: LineageNode[],
): ValidationResult {
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
 * Build the set of mutations required for a hierarchy transition.
 *
 * `task` is the target. `ancestors` ordered nearest-parent → root.
 * `descendantIds` is the list of task + descendant IDs (only needed for downward cascades).
 */
export function buildTransitionPlan(
  kind: TransitionKind,
  task: LineageNode,
  ancestors: LineageNode[],
  descendantIds: string[] = [],
): TransitionPlan {
  switch (kind) {
    case "COMPLETE":
      return buildCompletePlan(descendantIds);
    case "UNCOMPLETE":
      return buildUncompletePlan(task, ancestors);
    case "ARCHIVE":
      return buildArchivePlan(descendantIds);
    case "UNARCHIVE":
      return buildUnarchivePlan(task, ancestors);
    case "DELETE":
      return buildDeletePlan(descendantIds);
    case "UNDELETE":
      return buildUndeletePlan(task, ancestors);
  }
}

function buildCompletePlan(descendantIds: string[]): TransitionPlan {
  return {
    ...EMPTY_PLAN,
    setCompletedAt: { ids: descendantIds, value: new Date() },
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

function buildArchivePlan(descendantIds: string[]): TransitionPlan {
  return {
    ...EMPTY_PLAN,
    setArchivedAt: { ids: descendantIds, value: new Date() },
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

function buildDeletePlan(descendantIds: string[]): TransitionPlan {
  return {
    ...EMPTY_PLAN,
    setDeletedAt: { ids: descendantIds, value: new Date() },
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
