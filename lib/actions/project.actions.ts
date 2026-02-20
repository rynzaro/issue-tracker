"use server";

import { auth } from "@/auth";
import {
  createProject,
  getUserProjectById,
  getUserProjectWithTasks,
} from "../services/project.service";
import {
  createServiceErrorResponse,
  createSuccessResponseWithData,
  ServiceResponseWithData,
  validateInput,
} from "../services/serviceUtil";
import { Prisma, Project } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { CreateProjectParams, CreateProjectSchema } from "../schema/project";
import { TaskNode } from "../schema/task";

export async function createProjectAction(
  params: CreateProjectParams,
): Promise<ServiceResponseWithData<Project>> {
  // 1. Auth
  const session = await auth();
  if (!session?.user?.id) {
    return createServiceErrorResponse(
      "AUTHORIZATION_ERROR",
      "Unauthorized user",
    );
  }

  // 2. Validate input
  const validated = validateInput(CreateProjectSchema, params);
  if (!validated.success) {
    return validated;
  }

  // 3. Call service (already handles its own errors via serviceAction)
  const result = await createProject({
    userId: session.user.id,
    createProjectParams: validated.data,
  });

  revalidatePath("/s/main");
  return result;
}

export async function getUserProjectByIdAction(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return createServiceErrorResponse(
      "AUTHORIZATION_ERROR",
      "Unauthorized user",
    );
  }

  return getUserProjectById({
    userId: session.user.id,
    projectId,
  });
}

export async function getUserProjectWithTasksAction(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return createServiceErrorResponse(
      "AUTHORIZATION_ERROR",
      "Unauthorized user",
    );
  }

  return getUserProjectWithTasks({
    userId: session.user.id,
    projectId,
  });
}

export async function getUserProjectWithTasksAndChildrenAction(
  projectId: string,
) {
  const result = await getUserProjectWithTasksAction(projectId);

  if (!result.success) {
    return result;
  }

  const project = result.data;
  const tasks = project.tasks;

  const taskMap = new Map<string, TaskNode>();
  for (const task of tasks) {
    taskMap.set(task.id, { ...task, children: [] });
  }

  const roots: TaskNode[] = [];
  for (const task of taskMap.values()) {
    if (task.parentId) {
      taskMap.get(task.parentId)?.children.push(task);
    } else {
      roots.push(task);
    }
  }

  return createSuccessResponseWithData({ ...project, tasks: roots });
}
