import { Prisma } from "@prisma/client";
import z from "zod";

export type TaskStatus = "OPEN" | "IN_PROGRESS" | "DONE";

export const CreateTaskSchema = z.object({
  projectId: z.cuid(),
  parentId: z.cuid().nullable(),
  title: z.string().min(2).max(100),
  description: z.string().max(1000).optional(),
  estimate: z.number().int().min(0).optional(),
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
  include: { todoItems: true; taskTags: { include: { tag: true } } };
}> & {
  children: TaskNode[];
  status: TaskStatus;
  hasActiveDescendant: boolean;
  totalTimeSpent: number; // seconds
  activeTimerStartedAt: Date | null;
  sumOfChildrenEstimates: number; // minutes
  hasEstimateOverflow: boolean; // true if sumOfChildrenEstimates > estimate
};

/** Serializable version with Date fields converted to strings for client consumption */
export type SerializableTaskNode = Omit<
  TaskNode,
  | "createdAt"
  | "updatedAt"
  | "completedAt"
  | "archivedAt"
  | "deletedAt"
  | "activeTimerStartedAt"
  | "children"
  | "todoItems"
  | "taskTags"
> & {
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  archivedAt: string | null;
  deletedAt: string | null;
  activeTimerStartedAt: string | null;
  children: SerializableTaskNode[];
  todoItems: Array<
    Omit<TaskNode["todoItems"][number], "createdAt"> & {
      createdAt: string;
    }
  >;
  taskTags: Array<
    Omit<TaskNode["taskTags"][number], "createdAt"> & {
      createdAt: string;
      tag: TaskNode["taskTags"][number]["tag"]; // Tag has no Date fields
    }
  >;
};

/** Convert TaskNode to SerializableTaskNode for client transmission */
export function serializeTaskNode(node: TaskNode): SerializableTaskNode {
  return {
    ...node,
    createdAt: node.createdAt.toISOString(),
    updatedAt: node.updatedAt.toISOString(),
    completedAt: node.completedAt?.toISOString() ?? null,
    archivedAt: node.archivedAt?.toISOString() ?? null,
    deletedAt: node.deletedAt?.toISOString() ?? null,
    activeTimerStartedAt: node.activeTimerStartedAt?.toISOString() ?? null,
    children: node.children.map(serializeTaskNode),
    todoItems: node.todoItems.map((todo) => ({
      ...todo,
      createdAt: todo.createdAt.toISOString(),
    })),
    taskTags: node.taskTags.map((taskTag) => ({
      ...taskTag,
      createdAt: taskTag.createdAt.toISOString(),
      tag: taskTag.tag, // Tag has no Date fields, pass through as-is
    })),
  };
}
