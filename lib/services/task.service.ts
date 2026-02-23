import prisma from "@/lib/prisma";
import { CreateTaskParams, UpdateTaskParams } from "../schema/task";
import {
  createServiceErrorResponse,
  createSuccessResponseWithData,
  serviceAction,
} from "./serviceUtil";
import client from "@/lib/prisma";

// Task CRUD, hierarchy, status transitions (Iteration 1)
export function createTask({
  userId,
  createTaskParams,
}: {
  userId: string;
  createTaskParams: CreateTaskParams;
}) {
  return serviceAction(async () => {
    const project = await prisma.project.findUnique({
      where: { id: createTaskParams.projectId },
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
    const task = await prisma.task.findUnique({
      where: { id: updateTaskParams.id },
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

export function hasActiveTimers({ taskId }: { taskId: string }) {
  return serviceAction(async () => {
    const task = await client.task.findUnique({
      where: { id: taskId },
      select: { projectId: true },
    });
    if (!task) return createServiceErrorResponse("NOT_FOUND", "Task not found");

    const projectTasks = await client.task.findMany({
      where: { projectId: task.projectId },
      select: { id: true, parentId: true },
    });

    const childrenMap = new Map<string, string[]>();
    for (const t of projectTasks) {
      if (t.parentId) {
        if (!childrenMap.has(t.parentId)) childrenMap.set(t.parentId, []);
        childrenMap.get(t.parentId)!.push(t.id);
      }
    }
    const descendantIds: string[] = [];
    const queue = [taskId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      descendantIds.push(current);
      const children = childrenMap.get(current) ?? [];
      queue.push(...children);
    }

    const activeTimer = await client.activeTimer.findFirst({
      where: { taskId: { in: descendantIds } },
    });
    return createSuccessResponseWithData(!!activeTimer);
  }, "Failed to check active timers for task");
}
