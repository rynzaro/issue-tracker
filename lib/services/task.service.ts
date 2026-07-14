import { TaskEventType } from "@prisma/client";
import client from "@/lib/prisma";
import { CreateTaskParams, UpdateTaskParams } from "../schema/task";
import { emitEvent } from "./event.service";
import {
  createServiceErrorResponse,
  createSuccessResponseWithData,
  serviceAction,
} from "./serviceUtil";
import {
  validateTransition,
  buildTransitionPlan,
  type LineageNode,
  type TransitionPlan,
} from "./taskHierarchyPolicy";

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

async function executePlan(plan: TransitionPlan, tx: DbClient): Promise<void> {
  if (plan.setCompletedAt.ids.length > 0) {
    await tx.task.updateMany({
      where: { id: { in: plan.setCompletedAt.ids } },
      data: { completedAt: plan.setCompletedAt.value },
    });
  }
  if (plan.setArchivedAt.ids.length > 0) {
    await tx.task.updateMany({
      where: { id: { in: plan.setArchivedAt.ids } },
      data: { archivedAt: plan.setArchivedAt.value },
    });
  }
  if (plan.setDeletedAt.ids.length > 0) {
    await tx.task.updateMany({
      where: { id: { in: plan.setDeletedAt.ids } },
      data: { deletedAt: plan.setDeletedAt.value },
    });
  }
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
  return serviceAction(async () => {
    const task = await client.task.findUnique({
      where: { id: taskId, deletedAt: null },
      select: {
        id: true,
        title: true, // for the SUBTASK_REMOVED payload on the parent (#52)
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
      const validation = validateTransition("DELETE", task, ancestors);
      if (!validation.valid) {
        return createServiceErrorResponse(
          validation.error.code,
          validation.error.message,
        );
      }

      const descendants = await collectDescendantNodes(
        taskId,
        task.projectId,
        tx,
        true,
      );

      const activeTimer = await tx.activeTimer.findFirst({
        where: { taskId: { in: descendants.map((d) => d.id) } },
      });

      if (activeTimer) {
        return createServiceErrorResponse(
          "VALIDATION_ERROR",
          "Task with active Timer cannot be deleted",
        );
      }

      const plan = buildTransitionPlan("DELETE", task, ancestors, descendants);
      await executePlan(plan, tx);

      // Record the removal on the former direct parent's trail (#52). Only the
      // directly-deleted task notifies its parent; descendants swept up by the
      // same cascade do not emit (ADR-0020 boundary).
      if (task.parentId) {
        await emitEvent(tx, {
          taskId: task.parentId,
          userId,
          type: TaskEventType.SUBTASK_REMOVED,
          payload: { childTaskId: task.id, childTitle: task.title },
        });
      }

      return createSuccessResponseWithData({
        id: taskId,
        deletedCount: plan.setDeletedAt.ids.length,
      });
    });
  }, "Failed to delete task");
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
  return serviceAction(async () => {
    const task = await client.task.findUnique({
      where: { id: taskId, deletedAt: null },
      select: {
        id: true,
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
      const validation = validateTransition("COMPLETE", task, ancestors);
      if (!validation.valid) {
        return createServiceErrorResponse(
          validation.error.code,
          validation.error.message,
        );
      }

      const descendants = await collectDescendantNodes(
        taskId,
        task.projectId,
        tx,
      );

      const activeTimer = await tx.activeTimer.findFirst({
        where: { taskId: { in: descendants.map((d) => d.id) } },
      });
      if (activeTimer) {
        return createServiceErrorResponse(
          "VALIDATION_ERROR",
          "Task with active Timer cannot be marked as complete",
        );
      }

      const plan = buildTransitionPlan(
        "COMPLETE",
        task,
        ancestors,
        descendants,
      );
      await executePlan(plan, tx);

      return createSuccessResponseWithData({
        id: taskId,
        completedCount: plan.setCompletedAt.ids.length,
      });
    });
  }, "Failed to complete task");
}

export function uncompleteTask({
  taskId,
  userId,
}: {
  taskId: string;
  userId: string;
}) {
  return serviceAction(async () => {
    const task = await client.task.findUnique({
      where: {
        id: taskId,
        deletedAt: null,
      },
      select: {
        id: true,
        parentId: true,
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
      const validation = validateTransition("UNCOMPLETE", task, ancestors);
      if (!validation.valid) {
        return createServiceErrorResponse(
          validation.error.code,
          validation.error.message,
        );
      }

      const plan = buildTransitionPlan("UNCOMPLETE", task, ancestors);
      await executePlan(plan, tx);

      return createSuccessResponseWithData({
        id: taskId,
        uncompletedCount: plan.setCompletedAt.ids.length,
      });
    });
  }, "Failed to uncomplete task");
}

// ─── Archive / Unarchive / Restore ─────────────────────────────────────────────

export function archiveTask({
  taskId,
  userId,
}: {
  taskId: string;
  userId: string;
}) {
  return serviceAction(async () => {
    const task = await client.task.findUnique({
      where: { id: taskId, deletedAt: null, archivedAt: null },
      select: {
        id: true,
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
      const validation = validateTransition("ARCHIVE", task, ancestors);
      if (!validation.valid) {
        return createServiceErrorResponse(
          validation.error.code,
          validation.error.message,
        );
      }

      const descendants = await collectDescendantNodes(
        taskId,
        task.projectId,
        tx,
      );

      const activeTimer = await tx.activeTimer.findFirst({
        where: { taskId: { in: descendants.map((d) => d.id) } },
      });
      if (activeTimer) {
        return createServiceErrorResponse(
          "VALIDATION_ERROR",
          "Task with active Timer cannot be archived",
        );
      }

      const plan = buildTransitionPlan(
        "ARCHIVE",
        task,
        ancestors,
        descendants,
      );
      await executePlan(plan, tx);

      return createSuccessResponseWithData({
        id: taskId,
        archivedCount: plan.setArchivedAt.ids.length,
      });
    });
  }, "Failed to archive task");
}

export function unarchiveTask({
  taskId,
  userId,
}: {
  taskId: string;
  userId: string;
}) {
  return serviceAction(async () => {
    const task = await client.task.findUnique({
      where: { id: taskId, archivedAt: { not: null }, deletedAt: null },
      select: {
        id: true,
        parentId: true,
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
      const validation = validateTransition("UNARCHIVE", task, ancestors);
      if (!validation.valid) {
        return createServiceErrorResponse(
          validation.error.code,
          validation.error.message,
        );
      }

      const plan = buildTransitionPlan("UNARCHIVE", task, ancestors);
      await executePlan(plan, tx);

      return createSuccessResponseWithData({ id: taskId });
    });
  }, "Failed to unarchive task");
}

export function restoreDeletedTask({
  taskId,
  userId,
}: {
  taskId: string;
  userId: string;
}) {
  return serviceAction(async () => {
    const task = await client.task.findUnique({
      where: { id: taskId, deletedAt: { not: null } },
      select: {
        id: true,
        parentId: true,
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
      const validation = validateTransition("UNDELETE", task, ancestors);
      if (!validation.valid) {
        return createServiceErrorResponse(
          validation.error.code,
          validation.error.message,
        );
      }

      const plan = buildTransitionPlan("UNDELETE", task, ancestors);
      await executePlan(plan, tx);

      return createSuccessResponseWithData({
        id: taskId,
        restoredCount: plan.setDeletedAt.ids.length,
      });
    });
  }, "Failed to restore task");
}
