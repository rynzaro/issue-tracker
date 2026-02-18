import client from "@/lib/prisma";

import { PrismaClient } from "@prisma/client";

export async function createProject(
  userId: string,
  name: string,
  description?: string,
  projectSettings?: {
    autoCheckpointsEnabled: boolean;
    autoCheckpointOnScopeChange: boolean;
    autoCheckpointOnEstimateChange: boolean;
    checkpointDebounceMinutes: number;
  },
) {
  const newProjectSettings = await client.projectSettings.create({
    data: projectSettings || {
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
      name,
      description,
      userId,
      projectSettingsId: newProjectSettings.id,
    },
  });

  return project;
}

export async function getProjectsByUser(userId: string) {
  return client.project.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}
