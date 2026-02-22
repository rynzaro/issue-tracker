import { Prisma } from "@prisma/client";
import z from "zod";

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

export type TaskNode = Prisma.TaskGetPayload<{
  include: { todoItems: true; taskTags: { include: { tag: true } } };
}> & { children: TaskNode[] };
