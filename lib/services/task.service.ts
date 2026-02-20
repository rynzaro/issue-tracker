import prisma from "@/lib/prisma";
import { CreateTaskParams } from "../schema/task";
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
        ...(createTaskParams.parentId
          ? { parent: { connect: { id: createTaskParams.parentId } } }
          : {}),
        todoItems: {
          create: createTaskParams.todoItems?.map((todo) => ({
            title: todo.title,
            estimate: todo.estimate,
          })),
        },
        tags: {
          connect: createTaskParams.tagIds?.map((id) => ({ id })),
        },
      },
    });
    return createSuccessResponseWithData(task);
  }, "Failed to create task");
}
