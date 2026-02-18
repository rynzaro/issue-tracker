"use server";

import { auth } from "@/auth";
import z from "zod";
import { createProject } from "../services/project.service";
import {
  createServiceErrorResponse,
  createSuccessResponse,
  ServiceResponseWithData,
} from "../services/serviceUtil";
import { Project } from "@prisma/client";
import { revalidatePath } from "next/cache";

const CreateProjectSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(1000).optional(),
  projectSettings: z
    .object({
      autoCheckpointsEnabled: z.boolean(),
      autoCheckpointOnScopeChange: z.boolean(),
      autoCheckpointOnEstimateChange: z.boolean(),
      checkpointDebounceMinutes: z.number().int().min(0).max(1440),
    })
    .optional(),
});

export type CreateProjectParams = z.infer<typeof CreateProjectSchema>;

export async function createProjectAction(
  params: CreateProjectParams,
): Promise<ServiceResponseWithData<Project>> {
  const session = await auth();
  if (!session?.user?.id) {
    console.log(session);
    return createServiceErrorResponse("UNAUTHORIZED", "Unauthorized user");
  }

  try {
    const project = await createProject(
      session.user.id,
      params.name,
      params.description,
      params.projectSettings,
    );
    revalidatePath("/s/main");
    return createSuccessResponse(project);
  } catch (error) {
    return createServiceErrorResponse(
      "INTERNAL_SERVER_ERROR",
      "An error occurred while creating the project.",
      error,
    );
  }
}
