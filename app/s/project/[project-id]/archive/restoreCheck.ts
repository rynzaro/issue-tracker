import { TaskNode, type TaskLineage } from "@/lib/schema/task";
import {
  validateTransition,
  buildTransitionPlan,
  OWN_STATE,
  type TransitionKind,
} from "@/lib/domain/taskHierarchyPolicy";

/** What the restore dialog needs to know before it asks the user. */
export type RestoreCheck = {
  canRestore: boolean;
  description: string;
  warning?: string;
  affectedAncestors: TaskLineage[];
};

/** Which of the two lists the user is restoring from, as the policy names it. */
const RESTORE_KIND: Record<"archived" | "deleted", TransitionKind> = {
  archived: "UNARCHIVE",
  deleted: "UNDELETE",
};

export function getAffectedSummary(affectedAncestors: TaskLineage[]): string {
  if (affectedAncestors.length === 0) {
    return "";
  }

  return `Diese Aktion stellt diese Aufgabe und ${affectedAncestors.length} weitere Aufgabe${affectedAncestors.length > 1 ? "n" : ""} wieder her.`;
}

function collectAncestors(
  task: TaskNode,
  parentMap: Record<string, TaskLineage>,
): TaskLineage[] {
  const ancestors: TaskLineage[] = [];
  const visited = new Set<string>();
  let currentParentId = task.parentId;

  while (currentParentId && !visited.has(currentParentId)) {
    visited.add(currentParentId);
    const parent = parentMap[currentParentId];
    if (!parent) break;
    ancestors.push(parent);
    currentParentId = parent.parentId;
  }

  return ancestors;
}

/** How this dialog names a state the user has to be told about. */
function stateLabel(task: TaskLineage): string {
  if (task.deletedAt) return "gelöscht";
  if (task.archivedAt) return "archiviert";
  return "erledigt";
}

/**
 * Ask the domain policy what this restore would do, and say it in German.
 *
 * No rule is decided here (#64). This used to be a second copy of the
 * transition rules, written against a flattened state label, and it disagreed
 * with the server: it refused to undelete a task under an archived ancestor,
 * which the server has always allowed. Now the same `validateTransition` and
 * `buildTransitionPlan` the server runs give the answer, and this only puts it
 * into words.
 */
export function getRestoreCheck(
  task: TaskNode,
  mode: "archived" | "deleted",
  parentMap: Record<string, TaskLineage>,
): RestoreCheck {
  const kind = RESTORE_KIND[mode];
  const ancestors = collectAncestors(task, parentMap);

  const validation = validateTransition(kind, task, ancestors);
  if (!validation.valid) {
    const blocker = validation.error.taskId
      ? parentMap[validation.error.taskId]
      : undefined;
    // The blocker can be the task itself: its own state no longer allows the
    // restore, usually because a second tab went stale. `parentMap` holds
    // every project task, so the lookup finds it — it must not be presented
    // as its own parent.
    const description = !blocker
      ? "Wiederherstellung nicht möglich."
      : blocker.id !== task.id
        ? `Wiederherstellung nicht möglich — die Überaufgabe „${blocker.title}" ist ${stateLabel(blocker)}.`
        : task.deletedAt
          ? "Wiederherstellung nicht möglich — die Aufgabe ist gelöscht."
          : `Wiederherstellung nicht möglich — die Aufgabe ist nicht mehr ${mode === "archived" ? "archiviert" : "gelöscht"}.`;
    return {
      canRestore: false,
      description,
      affectedAncestors: [],
    };
  }

  const plan = buildTransitionPlan(kind, task, ancestors);

  // The plan's own-state write is the restore itself: this task, plus the
  // ancestors it has to bring back along with it.
  const affectedAncestors = plan.writes
    .filter((w) => w.state === OWN_STATE[kind])
    .flatMap((w) => w.ids)
    .filter((id) => id !== task.id)
    .map((id) => parentMap[id])
    .filter((a): a is TaskLineage => Boolean(a));

  // Any other write the plan makes on this task is a state it takes on from an
  // ancestor to keep the tree whole (#63). The user should hear about it: the
  // task will not come back the way they left it.
  const inherited = plan.writes.find(
    (w) => w.state !== OWN_STATE[kind] && w.ids.includes(task.id),
  );

  return {
    canRestore: true,
    description: "Bist du dir sicher?",
    warning:
      inherited?.state === "archivedAt"
        ? "Die Aufgabe wird archiviert wiederhergestellt, weil eine Überaufgabe archiviert ist."
        : inherited?.state === "completedAt"
          ? "Die Aufgabe wird als erledigt wiederhergestellt, weil eine Überaufgabe erledigt ist."
          : undefined,
    affectedAncestors,
  };
}
