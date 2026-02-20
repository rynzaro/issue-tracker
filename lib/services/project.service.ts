import client from "@/lib/prisma";
import {
  createServiceErrorResponse,
  createSuccessResponseWithData,
  serviceAction,
  serviceQuery,
  serviceQueryOrNotFound,
  ServiceResponseWithData,
} from "./serviceUtil";
import { Project } from "@prisma/client";
import { CreateProjectParams } from "../schema/project";

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

export function deleteProject(projectId: string) {
  return serviceQueryOrNotFound(
    () =>
      client.project.update({
        where: { id: projectId },
        data: { deletedAt: new Date() },
      }),
    "Project not found",
    "Failed to delete project",
  );
}

export function getProjectById(projectId: string) {
  return serviceQueryOrNotFound(
    () => client.project.findUnique({ where: { id: projectId } }),
    "Project not found",
    "Failed to fetch project",
  );
}

export function getProjectsByUser(userId: string) {
  return serviceQuery(
    () =>
      client.project.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
    "Failed to fetch projects",
  );
}
