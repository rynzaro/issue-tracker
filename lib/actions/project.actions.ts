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
import { Project } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { CreateProjectParams, CreateProjectSchema } from "../schema/project";
import { TaskNode } from "../schema/task";
import { getActiveTimeEntryForUser } from "../services/activeTask.service";

export async function createProjectAction(
  params: CreateProjectParams,
): Promise<ServiceResponseWithData<Project>> {
  const session = await auth();
  if (!session?.user?.id) {
    return createServiceErrorResponse(
      "AUTHORIZATION_ERROR",
      "Unauthorized user",
    );
  }

  const validated = validateInput(CreateProjectSchema, params);
  if (!validated.success) {
    return validated;
  }

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

export async function getUserProjectWithTasksAndChildrenAction({
  projectId,
}: {
  projectId: string;
}): Promise<ServiceResponseWithData<Project & { tasks: TaskNode[] }>> {
  const session = await auth();
  const result = await getUserProjectWithTasksAction(projectId);

  if (!result.success) {
    return result;
  }

  if (!session?.user?.id || session.user.id !== result.data.userId) {
    return createServiceErrorResponse(
      // This is unexpected because getUserProjectWithTasksAction should have already returned an auth error if the user is not authorized
      "UNEXPECTED_ERROR",
      "Unauthorized user",
    );
  }

  const activeTasksResult = await getActiveTimeEntryForUser({
    userId: session?.user?.id ?? "",
  });

  if (!activeTasksResult.success) {
    return createServiceErrorResponse(
      "UNEXPECTED_ERROR",
      "Failed to fetch active tasks",
    );
  }

  const project = result.data;
  const activeTaskId = activeTasksResult.data?.taskId ?? null;
  const activeTimerStartedAt = activeTasksResult.data?.startedAt ?? null;

  const taskMap = new Map<string, TaskNode>();
  for (const task of project.tasks) {
    const totalTimeSpent = task.timeEntries.reduce(
      (sum, te) => sum + te.duration,
      0,
    );
    taskMap.set(task.id, {
      ...task,
      children: [],
      status: "OPEN",
      hasActiveDescendant: false,
      totalTimeSpent,
      activeTimerStartedAt:
        task.id === activeTaskId ? activeTimerStartedAt : null,
    });
  }

  const roots: TaskNode[] = [];
  for (const task of taskMap.values()) {
    if (task.parentId) {
      taskMap.get(task.parentId)?.children.push(task);
    } else {
      roots.push(task);
    }
  }

  // Post-order traversal: derive status and hasActiveDescendant bottom-up
  function deriveActivityAndAddDuration(node: TaskNode): void {
    for (const child of node.children) {
      deriveActivityAndAddDuration(child);
    }
    node.status = node.completedAt
      ? "DONE"
      : node.id === activeTaskId
        ? "IN_PROGRESS"
        : "OPEN";
    node.hasActiveDescendant = node.children.some(
      (c) => c.status === "IN_PROGRESS" || c.hasActiveDescendant,
    );
    node.totalTimeSpent = node.children.reduce(
      (sum, c) => sum + c.totalTimeSpent,
      node.totalTimeSpent,
    );
  }

  for (const root of roots) {
    deriveActivityAndAddDuration(root);
  }

  return createSuccessResponseWithData({ ...project, tasks: roots });
}
