"use server";

import { auth } from "@/auth";
import {
  createProject,
  getUserProjectById,
  getUserProjectWithTasks,
} from "../services/project.service";
import {
  createServiceErrorResponse,
  ServiceResponseWithData,
  validateInput,
} from "../services/serviceUtil";
import { Project } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { CreateProjectParams, CreateProjectSchema } from "../schema/project";

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
