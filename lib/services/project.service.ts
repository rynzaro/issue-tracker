import client from "@/lib/prisma";
import {
  createServiceErrorResponse,
  createSuccessResponseWithData,
  logServiceError,
  serviceAction,
  serviceQuery,
  ServiceResponseWithData,
} from "./serviceUtil";
import { Project } from "@prisma/client";
import { CreateProjectParams, ProjectWithTaskTree, UpdateProjectParams } from "../schema/project";
import { TaskNode } from "../schema/task";
import { getActiveTimeEntryForUser } from "./activeTask.service";

export async function createProject({
  userId,
  createProjectParams,
}: {
  userId: string;
  createProjectParams: CreateProjectParams;
}): Promise<ServiceResponseWithData<Project>> {
  return serviceAction(async () => {
    const user = await client.user.findUnique({ where: { id: userId } });
    if (!user) {
      return createServiceErrorResponse("UNEXPECTED_ERROR", "User not found");
    }
    const newProjectSettings = await client.projectSettings.create({
      data: createProjectParams.projectSettings || {
        autoCheckpointOnEstimateChange: true,
        autoCheckpointOnScopeChange: true,
        autoCheckpointsEnabled: true,
        checkpointDebounceMinutes: 30,
      },
      select: {
        id: true,
      },
    });
    const project = await client.project.create({
      data: {
        name: createProjectParams.name,
        description: createProjectParams.description ?? undefined,
        userId,
        projectSettingsId: newProjectSettings.id,
      },
    });
    return createSuccessResponseWithData(project);
  }, "Failed to create project");
}

export function updateProject({
  projectId,
  userId,
  updates,
}: {
  projectId: string;
  userId: string;
  updates: Omit<UpdateProjectParams, "id">;
}) {
  return serviceAction(async () => {
    const project = await client.project.findUnique({
      where: { id: projectId, deletedAt: null },
    });

    if (!project) {
      return createServiceErrorResponse("NOT_FOUND", "Project not found");
    }

    if (project.userId !== userId) {
      logServiceError(
        "Unauthorized project update",
        `User ${userId} attempted to update project ${projectId} owned by ${project.userId}`,
      );
      return createServiceErrorResponse("NOT_FOUND", "Project not found");
    }

    // Prisma treats `undefined` fields as "don't update" — no conditional spreads needed
    const { name, description, isDefault } = updates;

    if (isDefault === true) {
      // Transaction: clear all defaults for this user, then set this one
      const [, updated] = await client.$transaction([
        client.project.updateMany({
          where: { userId, isDefault: true, deletedAt: null },
          data: { isDefault: false },
        }),
        client.project.update({
          where: { id: projectId },
          data: { name, description, isDefault: true },
        }),
      ]);
      return createSuccessResponseWithData(updated);
    }

    const updated = await client.project.update({
      where: { id: projectId },
      data: { name, description },
    });
    return createSuccessResponseWithData(updated);
  }, "Failed to update project");
}

export function deleteProject({
  projectId,
  userId,
}: {
  projectId: string;
  userId: string;
}) {
  return serviceAction(async () => {
    const project = await client.project.findUnique({
      where: { id: projectId, deletedAt: null },
    });

    if (!project) {
      return createServiceErrorResponse("NOT_FOUND", "Project not found");
    }

    if (project.userId !== userId) {
      logServiceError(
        "Unauthorized project delete",
        `User ${userId} attempted to delete project ${projectId} owned by ${project.userId}`,
      );
      return createServiceErrorResponse("NOT_FOUND", "Project not found");
    }

    // Interactive transaction: check active timers + soft-delete atomically
    // Consistent with deleteTask — prevents race where a timer starts between check and delete
    return await client.$transaction(async (tx) => {
      const activeTimer = await tx.activeTimer.findFirst({
        where: { task: { projectId } },
      });

      if (activeTimer) {
        return createServiceErrorResponse(
          "VALIDATION_ERROR",
          "Projekt hat aktive Timer — bitte zuerst stoppen",
        );
      }

      // Cascade soft-delete: project + all its tasks (AD-10)
      const now = new Date();
      const deleted = await tx.project.update({
        where: { id: projectId },
        data: { deletedAt: now },
      });
      await tx.task.updateMany({
        where: { projectId, deletedAt: null },
        data: { deletedAt: now },
      });

      return createSuccessResponseWithData(deleted);
    });
  }, "Failed to delete project");
}

export function getProjectById(projectId: string) {
  return serviceAction(async () => {
    const project = await client.project.findUnique({
      where: { id: projectId, deletedAt: null },
    });
    if (!project) {
      return createServiceErrorResponse("NOT_FOUND", "Project not found");
    }
    return createSuccessResponseWithData(project);
  }, "Failed to fetch project");
}

export function getUserProjectById({
  userId,
  projectId,
}: {
  userId: string;
  projectId: string;
}) {
  return serviceAction(async () => {
    const project = await client.project.findUnique({
      where: { id: projectId, deletedAt: null },
    });

    if (!project) {
      return createServiceErrorResponse("NOT_FOUND", "Project not found");
    }

    if (project.userId !== userId) {
      logServiceError(
        "Unauthorized project access",
        `User ${userId} attempted to access project ${projectId} owned by ${project.userId}`,
      );
      return createServiceErrorResponse("NOT_FOUND", "Project not found");
    }

    return createSuccessResponseWithData(project);
  }, "Failed to fetch project");
}

export function getUserProjectWithTasks({
  userId,
  projectId,
}: {
  userId: string;
  projectId: string;
}) {
  return serviceAction(async () => {
    const project = await client.project.findUnique({
      where: { id: projectId, deletedAt: null },
      include: {
        tasks: {
          where: { deletedAt: null },
          include: {
            todoItems: true,
            taskTags: { include: { tag: true } },
            timeEntries: { select: { duration: true } },
          },
        },
      },
    });

    if (!project) {
      return createServiceErrorResponse("NOT_FOUND", "Project not found");
    }

    if (project.userId !== userId) {
      logServiceError(
        "Unauthorized project access",
        `User ${userId} attempted to access project ${projectId} owned by ${project.userId}`,
      );
      return createServiceErrorResponse("NOT_FOUND", "Project not found");
    }

    return createSuccessResponseWithData(project);
  }, "Failed to fetch project");
}

export function getProjectsByUser(userId: string) {
  return serviceQuery(
    () =>
      client.project.findMany({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: "desc" },
      }),
    "Failed to fetch projects",
  );
}

export function getProjectTaskTree({
  userId,
  projectId,
}: {
  userId: string;
  projectId: string;
}): Promise<ServiceResponseWithData<ProjectWithTaskTree>> {
  return serviceAction(async () => {
    const projectResult = await getUserProjectWithTasks({ userId, projectId });
    if (!projectResult.success) return projectResult;

    const activeTimerResult = await getActiveTimeEntryForUser({ userId });
    if (!activeTimerResult.success) {
      return createServiceErrorResponse(
        "UNEXPECTED_ERROR",
        "Failed to fetch active timer",
      );
    }

    const project = projectResult.data;
    const activeTaskId = activeTimerResult.data?.taskId ?? null;
    const activeTimerStartedAt = activeTimerResult.data?.startedAt ?? null;

    // Build task tree from flat list
    const taskMap = new Map<string, TaskNode>();
    for (const task of project.tasks) {
      const totalTimeSpent = task.timeEntries.reduce(
        (sum, te) => sum + te.duration,
        0,
      );
      // Destructure to avoid serializing raw timeEntries to the client
      const { timeEntries: _timeEntries, ...taskData } = task;
      taskMap.set(task.id, {
        ...taskData,
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

    const { tasks: _flatTasks, ...projectData } = project;
    return createSuccessResponseWithData({ ...projectData, tasks: roots });
  }, "Failed to build task tree");
}
