import client from "@/lib/prisma";
import { CreateTaskParams, UpdateTaskParams } from "../schema/task";
import {
  createServiceErrorResponse,
  createSuccessResponseWithData,
  serviceAction,
} from "./serviceUtil";

// ─── Shared Helpers ────────────────────────────────────────────────────────────

/** Subset of PrismaClient used by collectDescendantIds — satisfied by both client and tx */
type DbClient = Pick<typeof client, "task">;

/**
 * BFS to collect a task and all its descendants within a project.
 * Only traverses non-deleted tasks.
 * Accepts an optional `db` client to run inside an interactive transaction.
 */
async function collectDescendantIds(
  taskId: string,
  projectId: string,
  db: DbClient = client,
): Promise<string[]> {
  const projectTasks = await db.task.findMany({
    where: { projectId, deletedAt: null },
    select: { id: true, parentId: true },
  });

  const childrenMap = new Map<string, string[]>();
  for (const t of projectTasks) {
    if (t.parentId) {
      if (!childrenMap.has(t.parentId)) childrenMap.set(t.parentId, []);
      childrenMap.get(t.parentId)!.push(t.id);
    }
  }

  const allIds: string[] = [];
  const queue = [taskId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    allIds.push(current);
    const children = childrenMap.get(current) ?? [];
    queue.push(...children);
  }
  return allIds;
}

// ─── Task CRUD ─────────────────────────────────────────────────────────────────

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

    // Verify parent task exists, belongs to the same project, and is not soft-deleted
    if (createTaskParams.parentId) {
      const parentTask = await client.task.findUnique({
        where: {
          id: createTaskParams.parentId,
          projectId: createTaskParams.projectId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!parentTask) {
        return createServiceErrorResponse("NOT_FOUND", "Parent task not found");
      }
    }

    const task = await client.task.create({
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
    return createSuccessResponseWithData(task);
  }, "Failed to create task");
}

export function updateTask({
  userId,
  updateTaskParams,
}: {
  userId: string;
  updateTaskParams: UpdateTaskParams;
}) {
  return serviceAction(async () => {
    const task = await client.task.findUnique({
      where: { id: updateTaskParams.id, deletedAt: null },
      select: { project: { select: { userId: true } } },
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

    const updatedTask = await client.task.update({
      where: { id: updateTaskParams.id },
      data: {
        title: updateTaskParams.title,
        description: updateTaskParams.description,
        estimate: updateTaskParams.estimate,
        ...(updateTaskParams.tagIds !== null
          ? {
              taskTags: {
                deleteMany: { userId },
                create: updateTaskParams.tagIds.map((tagId) => ({
                  tag: { connect: { id: tagId } },
                  user: { connect: { id: userId } },
                })),
              },
            }
          : {}),
      },
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
        projectId: true,
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

    // Interactive transaction: collect descendants + check active timers + soft-delete atomically.
    // Prevents race where a timer starts or a child is added between checks and delete.
    return await client.$transaction(async (tx) => {
      const allIds = await collectDescendantIds(taskId, task.projectId, tx);

      const activeTimer = await tx.activeTimer.findFirst({
        where: { taskId: { in: allIds } },
      });

      if (activeTimer) {
        return createServiceErrorResponse(
          "VALIDATION_ERROR",
          "Aufgabe mit aktivem Timer kann nicht gelöscht werden",
        );
      }

      await tx.task.updateMany({
        where: { id: { in: allIds } },
        data: { deletedAt: new Date() },
      });

      return createSuccessResponseWithData({
        id: taskId,
        deletedCount: allIds.length,
      });
    });
  }, "Failed to delete task");
}

export function hasActiveTimers({ taskId }: { taskId: string }) {
  return serviceAction(async () => {
    const task = await client.task.findUnique({
      where: { id: taskId, deletedAt: null },
      select: { projectId: true },
    });
    if (!task) return createServiceErrorResponse("NOT_FOUND", "Task not found");

    const descendantIds = await collectDescendantIds(taskId, task.projectId);

    const activeTimer = await client.activeTimer.findFirst({
      where: { taskId: { in: descendantIds } },
    });
    return createSuccessResponseWithData(!!activeTimer);
  }, "Failed to check active timers for task");
}
