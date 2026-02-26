"use server";

import { auth } from "@/auth";
import {
  createProject,
  deleteProject,
  getProjectTaskTree,
  getUserProjectById,
  getUserProjectWithTasks,
  updateProject,
} from "../services/project.service";
import {
  createServiceErrorResponse,
  ServiceResponseWithData,
  validateInput,
} from "../services/serviceUtil";
import { Project } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  CreateProjectParams,
  CreateProjectSchema,
  ProjectWithTaskTree,
  UpdateProjectParams,
  UpdateProjectSchema,
} from "../schema/project";
import { z } from "zod";

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

  if (result.success) revalidatePath("/s", "layout");
  return result;
}

export async function updateProjectAction(params: UpdateProjectParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return createServiceErrorResponse(
      "AUTHORIZATION_ERROR",
      "Unauthorized user",
    );
  }

  const validated = validateInput(UpdateProjectSchema, params);
  if (!validated.success) {
    return validated;
  }

  const { id, ...updates } = validated.data;

  const result = await updateProject({
    projectId: id,
    userId: session.user.id,
    updates,
  });

  if (result.success) revalidatePath("/s", "layout");
  return result;
}

export async function deleteProjectAction(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return createServiceErrorResponse(
      "AUTHORIZATION_ERROR",
      "Unauthorized user",
    );
  }

  const validated = z.string().cuid().safeParse(projectId);
  if (!validated.success) {
    return createServiceErrorResponse("VALIDATION_ERROR", "Invalid project ID");
  }

  const result = await deleteProject({
    projectId: validated.data,
    userId: session.user.id,
  });

  if (result.success) revalidatePath("/s", "layout");
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

  const validated = z.string().cuid().safeParse(projectId);
  if (!validated.success) {
    return createServiceErrorResponse("VALIDATION_ERROR", "Invalid project ID");
  }

  return getUserProjectById({
    userId: session.user.id,
    projectId: validated.data,
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

  const validated = z.string().cuid().safeParse(projectId);
  if (!validated.success) {
    return createServiceErrorResponse("VALIDATION_ERROR", "Invalid project ID");
  }

  return getUserProjectWithTasks({
    userId: session.user.id,
    projectId: validated.data,
  });
}

export async function getUserProjectWithTasksAndChildrenAction({
  projectId,
}: {
  projectId: string;
}): Promise<ServiceResponseWithData<ProjectWithTaskTree>> {
  const session = await auth();
  if (!session?.user?.id) {
    return createServiceErrorResponse(
      "AUTHORIZATION_ERROR",
      "Unauthorized user",
    );
  }

  const validated = z.string().cuid().safeParse(projectId);
  if (!validated.success) {
    return createServiceErrorResponse("VALIDATION_ERROR", "Invalid project ID");
  }

  return getProjectTaskTree({
    userId: session.user.id,
    projectId: validated.data,
  });
}
