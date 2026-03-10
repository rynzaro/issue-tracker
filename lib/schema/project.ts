import { Project } from "@prisma/client";
import z from "zod";
import { SerializableTaskNode, serializeTaskNode, TaskNode } from "./task";

/** Project with its full task tree — returned by getProjectTaskTree (server-side) */
export type ProjectWithTaskTree = Project & { tasks: TaskNode[] };

/** Serializable project with task tree for client consumption */
export type SerializableProjectWithTaskTree = Omit<
  Project,
  "createdAt" | "deletedAt"
> & {
  createdAt: string;
  deletedAt: string | null;
  tasks: SerializableTaskNode[];
};

/** Convert ProjectWithTaskTree to SerializableProjectWithTaskTree for client transmission */
export function serializeProjectWithTaskTree(
  project: ProjectWithTaskTree,
): SerializableProjectWithTaskTree {
  return {
    ...project,
    createdAt: project.createdAt.toISOString(),
    deletedAt: project.deletedAt?.toISOString() || null,
    tasks: project.tasks.map(serializeTaskNode),
  };
}

export const CreateProjectSchema = z.object({
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

// Note: isDefault is "set-only" — the service ignores isDefault: false.
// Only isDefault: true triggers the "clear others + set this" transaction.
export const UpdateProjectSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(1000).optional().nullable(),
  isDefault: z.boolean().optional(),
});

export type UpdateProjectParams = z.infer<typeof UpdateProjectSchema>;
