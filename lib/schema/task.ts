import { Prisma } from "@prisma/client";
import z from "zod";
import type { LineageNode } from "@/lib/domain/taskHierarchyPolicy";

export type TaskStatus = "OPEN" | "IN_PROGRESS" | "DONE";

/**
 * A task as its descendants' lineage sees it: what the hierarchy policy needs
 * to judge a transition, plus the title a dialog names it by.
 *
 * It carries the three dates rather than one state label. Collapsing them —
 * "archived" winning over "completed" — threw away what the policy reads, so
 * the client had to keep its own restore rule, and the two drifted apart (#64).
 */
export type TaskLineage = LineageNode & { title: string };

export const CreateTaskSchema = z.object({
  projectId: z.cuid(),
  parentId: z.cuid().nullable(),
  title: z.string().min(2).max(100),
  description: z.string().max(1000).optional(),
  estimate: z.number().int().min(0).optional(),
  addSubtaskEstimates: z.boolean().optional(),
  tagIds: z.array(z.int()).optional(),
  todoItems: z
    .array(
      z.object({
        title: z.string().min(1),
        estimate: z.int().optional(),
      }),
    )
    .optional(),
});

export type CreateTaskParams = z.infer<typeof CreateTaskSchema>;

export const UpdateTaskSchema = z.object({
  id: z.cuid(),
  title: z.string().min(2).max(100),
  description: z.string().max(1000).optional(),
  estimate: z.number().int().min(0).optional(),
  tagIds: z.array(z.int()).nullable(),
});

export type UpdateTaskParams = z.infer<typeof UpdateTaskSchema>;

export const DeleteTaskSchema = z.object({ taskId: z.cuid() });
export const CompleteTaskSchema = z.object({ taskId: z.cuid() });
export const UncompleteTaskSchema = z.object({ taskId: z.cuid() });
export const ArchiveTaskSchema = z.object({ taskId: z.cuid() });
export const UnarchiveTaskSchema = z.object({ taskId: z.cuid() });
export const RestoreDeletedTaskSchema = z.object({ taskId: z.cuid() });

/** Server-side task node with Date objects */
export type TaskNode = Prisma.TaskGetPayload<{
  include: {
    taskTags: { include: { tag: true } };
  };
}> & {
  children: TaskNode[];
  status: TaskStatus;
  hasActiveDescendant: boolean;
  totalTimeSpent: number; // seconds
  activeTimerStartedAt: Date | null;
  activeDescendantStartedAt: Date | null;
  sumOfChildrenEstimates: number; // minutes
  hasEstimateOverflow: boolean; // true if sumOfChildrenEstimates > estimate
  addSubtaskEstimates: boolean;
};
