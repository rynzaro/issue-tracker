import { Prisma, TaskEventType } from "@prisma/client";
import client from "@/lib/prisma";
import { CreateTaskParams, UpdateTaskParams } from "../schema/task";
import { emitEvent, type EmitEventInput } from "./event.service";
import {
  createServiceErrorResponse,
  createSuccessResponseWithData,
  serviceAction,
} from "./serviceUtil";
import {
  validateTransition,
  buildTransitionPlan,
  type LineageNode,
  type TransitionKind,
  type TransitionPlan,
} from "../domain/taskHierarchyPolicy";

// ─── Shared Helpers ────────────────────────────────────────────────────────────

/** Subset of PrismaClient used by collectDescendantIds — satisfied by both client and tx */
type DbClient = Pick<typeof client, "task">;
type AncestorRow = {
  id: string;
  parentId: string | null;
  completedAt: Date | null;
  deletedAt: Date | null;
  archivedAt: Date | null;
};

/**
 * BFS to collect a task and all its descendants within a project, with the
 * three state flags so the transition policy can decide what to touch.
 * Only traverses non-deleted and non-archived tasks.
 * Accepts an optional `db` client to run inside an interactive transaction.
 */
async function collectDescendantNodes(
  taskId: string,
  projectId: string,
  db: DbClient = client,
  includeArchived = false,
  includeDeleted = false,
): Promise<LineageNode[]> {
  const projectTasks = await db.task.findMany({
    where: {
      projectId,
      deletedAt: includeDeleted ? undefined : null,
      archivedAt: includeArchived ? undefined : null,
    },
    select: {
      id: true,
      parentId: true,
      completedAt: true,
      archivedAt: true,
      deletedAt: true,
    },
  });

  const byId = new Map(projectTasks.map((t) => [t.id, t]));
  const childrenMap = new Map<string, string[]>();
  for (const t of projectTasks) {
    if (t.parentId) {
      if (!childrenMap.has(t.parentId)) childrenMap.set(t.parentId, []);
      childrenMap.get(t.parentId)!.push(t.id);
    }
  }

  const nodes: LineageNode[] = [];
  const queue = [taskId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const node = byId.get(current);
    if (node) nodes.push(node);
    const children = childrenMap.get(current) ?? [];
    queue.push(...children);
  }
  return nodes;
}

/**
 * The six hierarchy-transition verbs as stored. All share
 * `statusTransitionPayload` (`{at, causedBy?}`) in event.service, so a single
 * payload shape is valid for whichever verb an event entry names.
 */
type TransitionEventType =
  | typeof TaskEventType.COMPLETED
  | typeof TaskEventType.UNCOMPLETED
  | typeof TaskEventType.ARCHIVED
  | typeof TaskEventType.UNARCHIVED
  | typeof TaskEventType.DELETED
  | typeof TaskEventType.RESTORED;

/**
 * Domain kind → stored event type. The policy plans events in the domain's own
 * words so it stays free of prisma (#59); this is the one place those words
 * meet the ledger's.
 */
const EVENT_TYPE_FOR: Record<TransitionKind, TransitionEventType> = {
  COMPLETE: TaskEventType.COMPLETED,
  UNCOMPLETE: TaskEventType.UNCOMPLETED,
  ARCHIVE: TaskEventType.ARCHIVED,
  UNARCHIVE: TaskEventType.UNARCHIVED,
  DELETE: TaskEventType.DELETED,
  UNDELETE: TaskEventType.RESTORED,
};

/**
 * Run a plan: its writes, then its events, on the caller's transaction so a
 * failure anywhere rolls the whole transition back (ADR-0020, CONTEXT.md
 * invariant 2).
 *
 * The policy already decided which tasks change, to what, and who hears about
 * it — including pruning the descendants the #44 stop rule halted — so this
 * needs no knowledge of the kind that produced the plan (#60, #62).
 */
async function executePlan(
  plan: TransitionPlan,
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<void> {
  for (const write of plan.writes) {
    await tx.task.updateMany({
      where: { id: { in: write.ids } },
      data: { [write.state]: write.value },
    });
  }
  for (const event of plan.events) {
    // Every `TransitionEventType` maps to the same `statusTransitionPayload`, so
    // this input satisfies whichever of the six arms the type selects — TS checks
    // that by distributing the literal over the extracted union, no cast needed.
    const input: Extract<EmitEventInput, { type: TransitionEventType }> = {
      taskId: event.taskId,
      userId,
      type: EVENT_TYPE_FOR[event.kind],
      payload:
        event.causedBy === undefined
          ? { at: event.at }
          : { at: event.at, causedBy: event.causedBy },
    };
    await emitEvent(tx, input);
  }
}

// ─── Hierarchy Transitions ─────────────────────────────────────────────────────

/**
 * All that differs between the six transitions. Everything else — the fetch,
 * the auth check, the transaction, validate → plan → execute — is one fixed
 * sequence in `applyTransition`, written once (#57, #62).
 *
 * `cascade` is set for exactly the three forward kinds. Reaching down the tree
 * is what makes a kind need the descendant scan, and what makes a running
 * timer somewhere below it a reason to refuse; backward kinds only repair
 * upward, so they need neither.
 *
 * Which descendants a kind may touch is deliberately absent: that is the
 * strength order's call, and the policy makes it (#62).
 */
const TRANSITIONS: Record<
  TransitionKind,
  {
    failureMessage: string;
    cascade: { timerBlockedMessage: string } | null;
  }
> = {
  COMPLETE: {
    failureMessage: "Failed to complete task",
    cascade: {
      timerBlockedMessage:
        "Task with active Timer cannot be marked as complete",
    },
  },
  ARCHIVE: {
    failureMessage: "Failed to archive task",
    cascade: { timerBlockedMessage: "Task with active Timer cannot be archived" },
  },
  DELETE: {
    failureMessage: "Failed to delete task",
    cascade: { timerBlockedMessage: "Task with active Timer cannot be deleted" },
  },
  UNCOMPLETE: { failureMessage: "Failed to uncomplete task", cascade: null },
  UNARCHIVE: { failureMessage: "Failed to unarchive task", cascade: null },
  UNDELETE: { failureMessage: "Failed to restore task", cascade: null },
};

/** The target as `applyTransition` fetches it: what the policy judges, plus
 *  what the auth check and the parent-trail event need. */
type TransitionTarget = LineageNode & {
  title: string;
  projectId: string;
  project: { userId: string };
};

/** How many tasks a plan touches — a task counts once even if several writes name it. */
function countChanged(plan: TransitionPlan): number {
  return new Set(plan.writes.flatMap((w) => w.ids)).size;
}

/**
 * The one path every hierarchy transition takes (#57, #62).
 *
 * Legality is the policy's alone: the fetch filters on nothing but the id, so
 * a task in the wrong state reaches `validateTransition` and gets a real
 * reason back, instead of being masked as NOT_FOUND by a `where` clause that
 * quietly encoded the same rule a second time.
 *
 * `afterPlan` is for ledger work a kind owes beyond its own transition —
 * today only DELETE, which also marks the removal on the parent's trail. It
 * runs on the same transaction, so it rolls back with everything else.
 */
async function applyTransition({
  kind,
  taskId,
  userId,
  afterPlan,
}: {
  kind: TransitionKind;
  taskId: string;
  userId: string;
  afterPlan?: (
    tx: Prisma.TransactionClient,
    task: TransitionTarget,
  ) => Promise<void>;
}) {
  const config = TRANSITIONS[kind];
  return serviceAction(async () => {
    const task = await client.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        parentId: true,
        projectId: true,
        completedAt: true,
        archivedAt: true,
        deletedAt: true,
        project: { select: { userId: true } },
      },
    });
    if (!task) {
      return createServiceErrorResponse("NOT_FOUND", "Task not found");
    }
    if (task.project.userId !== userId) {
      return createServiceErrorResponse(
        "AUTHORIZATION_ERROR",
        "User does not have access to this task",
      );
    }

    return await client.$transaction(async (tx) => {
      const ancestors = await getAllAncestors(task.parentId, tx);
      const validation = validateTransition(kind, task, ancestors);
      if (!validation.valid) {
        return createServiceErrorResponse(
          validation.error.code,
          validation.error.message,
        );
      }

      let descendants: LineageNode[] = [];
      if (config.cascade) {
        // The whole subtree, in whatever state. The policy's strength order
        // decides how far the cascade actually reaches, so filtering here
        // would be the same rule written a second time (#62).
        descendants = await collectDescendantNodes(
          taskId,
          task.projectId,
          tx,
          true,
          true,
        );
        const activeTimer = await tx.activeTimer.findFirst({
          where: { taskId: { in: descendants.map((d) => d.id) } },
        });
        if (activeTimer) {
          return createServiceErrorResponse(
            "VALIDATION_ERROR",
            config.cascade.timerBlockedMessage,
          );
        }
      }

      const plan = buildTransitionPlan(kind, task, ancestors, descendants);
      await executePlan(plan, tx, userId);
      await afterPlan?.(tx, task);

      return createSuccessResponseWithData({
        id: taskId,
        changedCount: countChanged(plan),
      });
    });
  }, config.failureMessage);
}

async function getAllAncestors(
  startingParentId: string | null,
  db: DbClient,
): Promise<AncestorRow[]> {
  let currentParentId: string | null = startingParentId;
  const ancestorRows: AncestorRow[] = [];

  while (currentParentId) {
    const parent: AncestorRow | null = await db.task.findUnique({
      where: { id: currentParentId },
      select: {
        id: true,
        parentId: true,
        completedAt: true,
        deletedAt: true,
        archivedAt: true,
      },
    });

    if (!parent) break;
    ancestorRows.push(parent);
    currentParentId = parent.parentId;
  }
  return ancestorRows;
}

export function createTask({
  userId,
  createTaskParams,
}: {
  userId: string;
  createTaskParams: CreateTaskParams;
}) {
  return serviceAction(async () => {
    const project = await client.project.findUnique({
      where: { id: createTaskParams.projectId, deletedAt: null },
      select: { userId: true },
    });
    if (!project) {
      return createServiceErrorResponse("NOT_FOUND", "Project not found");
    }
    if (project.userId !== userId) {
      return createServiceErrorResponse(
        "AUTHORIZATION_ERROR",
        "User does not have access to this project",
      );
    }

    // Verify parent task exists, belongs to the same project, and is not
    // soft-deleted, archived, or completed. Blocking completed parents keeps
    // completedAt cascade invariants intact (see ADR-0018) — reopening a
    // completed task to add subtasks is a deliberate future feature, not
    // this guard's job.
    if (createTaskParams.parentId) {
      const parentTask = await client.task.findUnique({
        where: {
          id: createTaskParams.parentId,
          projectId: createTaskParams.projectId,
          deletedAt: null,
          archivedAt: null,
          completedAt: null,
        },
        select: { id: true },
      });
      if (!parentTask) {
        return createServiceErrorResponse("NOT_FOUND", "Parent task not found");
      }
    }

    const task = await client.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          title: createTaskParams.title,
          description: createTaskParams.description,
          estimate: createTaskParams.estimate,
          project: { connect: { id: createTaskParams.projectId } },
          createdBy: { connect: { id: userId } },
          ...(createTaskParams.parentId
            ? { parent: { connect: { id: createTaskParams.parentId } } }
            : {}),
          todoItems: {
            create: createTaskParams.todoItems?.map((todo) => ({
              title: todo.title,
              estimate: todo.estimate,
            })),
          },
          taskTags: {
            create: createTaskParams.tagIds?.map((tagId) => ({
              tag: { connect: { id: tagId } },
              user: { connect: { id: userId } },
            })),
          },
        },
      });

      // CREATED marks the task's birth: title always, estimate/parentId only
      // when set. A task born with an estimate is fully covered here — no
      // separate ESTIMATE_CHANGED fires at creation (#51).
      await emitEvent(tx, {
        taskId: created.id,
        userId,
        type: TaskEventType.CREATED,
        payload: {
          title: createTaskParams.title,
          ...(createTaskParams.estimate !== undefined
            ? { estimate: createTaskParams.estimate }
            : {}),
          ...(createTaskParams.parentId
            ? { parentId: createTaskParams.parentId }
            : {}),
        },
      });

      // Record the new subtask on its direct parent's event trail (#52).
      // Emitted on the parent only; creation has no cascade to exclude.
      if (createTaskParams.parentId) {
        await emitEvent(tx, {
          taskId: createTaskParams.parentId,
          userId,
          type: TaskEventType.SUBTASK_CREATED,
          payload: { childTaskId: created.id, childTitle: created.title },
        });
      }

      return created;
    });
    return createSuccessResponseWithData(task);
  }, "Failed to create task");
}

/**
 * Update tasks if they are not archived or deleted, and user has access via project.
 * */
export function updateTask({
  userId,
  updateTaskParams,
}: {
  userId: string;
  updateTaskParams: UpdateTaskParams;
}) {
  return serviceAction(async () => {
    const task = await client.task.findUnique({
      where: { id: updateTaskParams.id, deletedAt: null, archivedAt: null },
      select: { estimate: true, project: { select: { userId: true } } },
    });
    if (!task) {
      return createServiceErrorResponse("NOT_FOUND", "Task not found");
    }
    if (!task.project) {
      return createServiceErrorResponse(
        "NOT_FOUND",
        "Task is not associated with a project",
      );
    }
    if (task.project.userId !== userId) {
      return createServiceErrorResponse(
        "AUTHORIZATION_ERROR",
        "User does not have access to this task",
      );
    }

    // null means "leave tags untouched"; an array (even empty) edits the set.
    const tagIds = updateTaskParams.tagIds;
    const oldEstimate = task.estimate;

    const updatedTask = await client.$transaction(async (tx) => {
      // Snapshot the tag set before the update so a TAGS_CHANGED event can record
      // before/after. Tags are per-user, so scope the read to this actor.
      const oldTagIds =
        tagIds !== null
          ? (
              await tx.taskTag.findMany({
                where: { taskId: updateTaskParams.id, userId },
                select: { tagId: true },
              })
            ).map((t) => t.tagId)
          : [];

      const updated = await tx.task.update({
        where: { id: updateTaskParams.id },
        data: {
          title: updateTaskParams.title,
          description: updateTaskParams.description,
          estimate: updateTaskParams.estimate,
          ...(tagIds !== null
            ? {
                taskTags: {
                  deleteMany: { userId },
                  create: tagIds.map((tagId) => ({
                    tag: { connect: { id: tagId } },
                    user: { connect: { id: userId } },
                  })),
                },
              }
            : {}),
        },
      });

      // ESTIMATE_CHANGED fires only on a real change. `undefined` means the
      // caller left estimate untouched (Prisma skips it), and an equal value is
      // a no-op — neither belongs in the audit trail. `old` is nullable since
      // the task may have had no estimate.
      if (
        updateTaskParams.estimate !== undefined &&
        updateTaskParams.estimate !== oldEstimate
      ) {
        await emitEvent(tx, {
          taskId: updateTaskParams.id,
          userId,
          type: TaskEventType.ESTIMATE_CHANGED,
          payload: { old: oldEstimate, new: updateTaskParams.estimate },
        });
      }

      // Emit only on a real change: re-submitting the same set (in any order)
      // is a no-op and must not leave a spurious audit event.
      if (tagIds !== null) {
        const oldSet = new Set(oldTagIds);
        const newSet = new Set(tagIds);
        const tagSetChanged =
          oldSet.size !== newSet.size ||
          [...newSet].some((id) => !oldSet.has(id));
        if (tagSetChanged) {
          await emitEvent(tx, {
            taskId: updateTaskParams.id,
            userId,
            type: TaskEventType.TAGS_CHANGED,
            payload: { old: oldTagIds, new: tagIds },
          });
        }
      }

      return updated;
    });
    return createSuccessResponseWithData(updatedTask);
  }, "Failed to update task");
}

export function deleteTask({
  taskId,
  userId,
}: {
  taskId: string;
  userId: string;
}) {
  return applyTransition({
    kind: "DELETE",
    taskId,
    userId,
    afterPlan: async (tx, task) => {
      // Record the removal on the former direct parent's trail (#52). Only the
      // directly-deleted task notifies its parent; descendants swept up by the
      // same cascade do not emit (ADR-0020 boundary). Not a transition event,
      // so it rides alongside the plan rather than in it.
      if (!task.parentId) return;
      await emitEvent(tx, {
        taskId: task.parentId,
        userId,
        type: TaskEventType.SUBTASK_REMOVED,
        payload: { childTaskId: task.id, childTitle: task.title },
      });
    },
  });
}

export function hasActiveDescendants({ taskId }: { taskId: string }) {
  return serviceAction(async () => {
    const task = await client.task.findUnique({
      where: { id: taskId, deletedAt: null },
      select: { projectId: true },
    });
    if (!task) return createServiceErrorResponse("NOT_FOUND", "Task not found");

    const descendants = await collectDescendantNodes(taskId, task.projectId);

    const activeTimer = await client.activeTimer.findFirst({
      where: { taskId: { in: descendants.map((d) => d.id) } },
    });
    return createSuccessResponseWithData(!!activeTimer);
  }, "Failed to check active timers for task");
}

export function completeTask({
  taskId,
  userId,
}: {
  taskId: string;
  userId: string;
}) {
  return applyTransition({ kind: "COMPLETE", taskId, userId });
}

export function uncompleteTask({
  taskId,
  userId,
}: {
  taskId: string;
  userId: string;
}) {
  return applyTransition({ kind: "UNCOMPLETE", taskId, userId });
}

export function archiveTask({
  taskId,
  userId,
}: {
  taskId: string;
  userId: string;
}) {
  return applyTransition({ kind: "ARCHIVE", taskId, userId });
}

export function unarchiveTask({
  taskId,
  userId,
}: {
  taskId: string;
  userId: string;
}) {
  return applyTransition({ kind: "UNARCHIVE", taskId, userId });
}

export function restoreDeletedTask({
  taskId,
  userId,
}: {
  taskId: string;
  userId: string;
}) {
  return applyTransition({ kind: "UNDELETE", taskId, userId });
}
