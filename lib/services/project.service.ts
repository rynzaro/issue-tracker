import client from "@/lib/prisma";
import {
  createServiceErrorResponse,
  createSuccessResponseWithData,
  logServiceError,
  serviceAction,
  serviceQuery,
  ServiceErrorResponse,
  ServiceResponseWithData,
} from "./serviceUtil";
import { Prisma, Project } from "@prisma/client";
import {
  CreateProjectParams,
  ProjectWithTaskTree,
  UpdateProjectParams,
} from "../schema/project";
import { TaskNode } from "../schema/task";
import { getActiveTimer } from "./activeTask.service";

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
          where: { deletedAt: null, archivedAt: null },
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

    const activeTimerResult = await getActiveTimer({ userId });
    if (!activeTimerResult.success) {
      return createServiceErrorResponse(
        "UNEXPECTED_ERROR",
        "Failed to fetch active timer",
      );
    }

    const project = projectResult.data;
    const activeTaskId = activeTimerResult.data?.taskId ?? null;
    const activeTimerStartedAt = activeTimerResult.data?.startedAt ?? null;

    const taskMap = new Map<string, TaskNode>();
    for (const task of project.tasks) {
      const totalTimeSpent = task.timeEntries.reduce(
        (sum, te) => sum + te.duration,
        0,
      );
      const { timeEntries: _timeEntries, ...taskData } = task;
      taskMap.set(task.id, {
        ...taskData,
        children: [],
        status: "OPEN",
        hasActiveDescendant: false,
        totalTimeSpent,
        activeTimerStartedAt:
          task.id === activeTaskId ? activeTimerStartedAt : null,
        sumOfChildrenEstimates: 0,
        hasEstimateOverflow: false,
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
      node.sumOfChildrenEstimates = node.children.reduce(
        (sum, c) => sum + (c.estimate ?? 0),
        0,
      );
      node.hasEstimateOverflow =
        node.estimate !== null && node.sumOfChildrenEstimates > node.estimate;
    }

    for (const root of roots) {
      deriveActivityAndAddDuration(root);
    }

    const { tasks: _flatTasks, ...projectData } = project;
    return createSuccessResponseWithData({ ...projectData, tasks: roots });
  }, "Failed to build task tree");
}

// ─── Archive / Deleted Queries ─────────────────────────────────────────────────

const archivedTaskIncludes = {
  todoItems: true,
  taskTags: { include: { tag: true } },
  timeEntries: { select: { duration: true } },
} satisfies Prisma.TaskInclude;

type TaskWithIncludes = Prisma.TaskGetPayload<{
  include: typeof archivedTaskIncludes;
}>;

function buildTaskNodeTree(flatTasks: TaskWithIncludes[]): TaskNode[] {
  const taskIds = new Set(flatTasks.map((t) => t.id));
  const taskMap = new Map<string, TaskNode>();

  for (const task of flatTasks) {
    const totalTimeSpent = task.timeEntries.reduce(
      (sum, te) => sum + te.duration,
      0,
    );
    const { timeEntries: _timeEntries, ...taskData } = task;
    taskMap.set(task.id, {
      ...taskData,
      children: [],
      status: task.completedAt ? "DONE" : "OPEN",
      hasActiveDescendant: false,
      totalTimeSpent,
      activeTimerStartedAt: null,
      sumOfChildrenEstimates: 0,
      hasEstimateOverflow: false,
    });
  }

  const roots: TaskNode[] = [];
  for (const node of taskMap.values()) {
    if (node.parentId && taskIds.has(node.parentId)) {
      taskMap.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  function accumulate(node: TaskNode): void {
    for (const child of node.children) accumulate(child);
    node.totalTimeSpent = node.children.reduce(
      (sum, c) => sum + c.totalTimeSpent,
      node.totalTimeSpent,
    );
    node.sumOfChildrenEstimates = node.children.reduce(
      (sum, c) => sum + (c.estimate ?? 0),
      0,
    );
    node.hasEstimateOverflow =
      node.estimate !== null && node.sumOfChildrenEstimates > node.estimate;
  }
  for (const root of roots) accumulate(root);

  return roots;
}

async function verifyProjectOwnership(
  userId: string,
  projectId: string,
): Promise<ServiceErrorResponse | null> {
  const project = await client.project.findUnique({
    where: { id: projectId, deletedAt: null },
    select: { userId: true },
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
  return null;
}

export function getArchivedTasksForProject({
  userId,
  projectId,
}: {
  userId: string;
  projectId: string;
}) {
  return serviceAction(async () => {
    const ownershipError = await verifyProjectOwnership(userId, projectId);
    if (ownershipError) return ownershipError;

    const tasks = await client.task.findMany({
      where: { projectId, archivedAt: { not: null }, deletedAt: null },
      include: archivedTaskIncludes,
    });

    return createSuccessResponseWithData(buildTaskNodeTree(tasks));
  }, "Failed to fetch archived tasks");
}

export function getDeletedTasksForProject({
  userId,
  projectId,
}: {
  userId: string;
  projectId: string;
}) {
  return serviceAction(async () => {
    const ownershipError = await verifyProjectOwnership(userId, projectId);
    if (ownershipError) return ownershipError;

    const tasks = await client.task.findMany({
      where: { projectId, deletedAt: { not: null } },
      include: archivedTaskIncludes,
    });

    return createSuccessResponseWithData(buildTaskNodeTree(tasks));
  }, "Failed to fetch deleted tasks");
}

// ─── Task Parent Map (for restore dialogs) ─────────────────────────────────────

export type TaskParentInfo = {
  id: string;
  parentId: string | null;
  title: string;
  state: "active" | "active_completed" | "archived" | "deleted";
};

type TaskParentRaw = {
  id: string;
  parentId: string | null;
  title: string;
  completedAt: Date | null;
  archivedAt: Date | null;
  deletedAt: Date | null;
};

function buildParentMap(
  tasks: TaskParentRaw[],
): Record<string, TaskParentInfo> {
  const map: Record<string, TaskParentInfo> = {};
  for (const t of tasks) {
    let state: TaskParentInfo["state"];
    if (t.deletedAt) {
      state = "deleted";
    } else if (t.archivedAt) {
      state = "archived";
    } else if (t.completedAt) {
      state = "active_completed";
    } else {
      state = "active";
    }
    map[t.id] = { id: t.id, parentId: t.parentId, title: t.title, state };
  }
  return map;
}

export function getProjectTaskParentMap({
  userId,
  projectId,
}: {
  userId: string;
  projectId: string;
}) {
  return serviceAction(async () => {
    const ownershipError = await verifyProjectOwnership(userId, projectId);
    if (ownershipError) return ownershipError;

    const tasks = await client.task.findMany({
      where: { projectId },
      select: {
        id: true,
        parentId: true,
        title: true,
        completedAt: true,
        archivedAt: true,
        deletedAt: true,
      },
    });

    return createSuccessResponseWithData(buildParentMap(tasks));
  }, "Failed to fetch task parent map");
}

// ─── Archive Page (consolidated) ──────────────────────────────────────────────

export type ArchivePageData = {
  project: Project;
  archivedTasks: TaskNode[];
  deletedTasks: TaskNode[];
  parentMap: Record<string, TaskParentInfo>;
};

export function getArchivePageData({
  userId,
  projectId,
}: {
  userId: string;
  projectId: string;
}): Promise<ServiceResponseWithData<ArchivePageData>> {
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

    const [archivedRaw, deletedRaw, allTasks] = await Promise.all([
      client.task.findMany({
        where: { projectId, archivedAt: { not: null }, deletedAt: null },
        include: archivedTaskIncludes,
      }),
      client.task.findMany({
        where: { projectId, deletedAt: { not: null } },
        include: archivedTaskIncludes,
      }),
      client.task.findMany({
        where: { projectId },
        select: {
          id: true,
          parentId: true,
          title: true,
          completedAt: true,
          archivedAt: true,
          deletedAt: true,
        },
      }),
    ]);

    return createSuccessResponseWithData({
      project,
      archivedTasks: buildTaskNodeTree(archivedRaw),
      deletedTasks: buildTaskNodeTree(deletedRaw),
      parentMap: buildParentMap(allTasks),
    });
  }, "Failed to fetch archive page data");
}
