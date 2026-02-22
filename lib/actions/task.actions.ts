"use server";

import { auth } from "@/auth";
import {
  CreateTaskParams,
  CreateTaskSchema,
  UpdateTaskParams,
  UpdateTaskSchema,
} from "../schema/task";
import {
  createServiceErrorResponse,
  validateInput,
} from "../services/serviceUtil";
import { createTask, updateTask } from "../services/task.service";
import { revalidatePath } from "next/cache";

export async function createTaskAction({
  createTaskParams,
}: {
  createTaskParams: CreateTaskParams;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return createServiceErrorResponse(
      "AUTHORIZATION_ERROR",
      "Unauthorized user",
    );
  }
  const validated = validateInput(CreateTaskSchema, createTaskParams);
  if (!validated.success) {
    return validated;
  }

  const result = await createTask({
    userId: session.user.id,
    createTaskParams: validated.data,
  });
  revalidatePath("/s/project", "layout");
  return result;
}

export async function updateTaskAction({
  updateTaskParams,
}: {
  updateTaskParams: UpdateTaskParams;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return createServiceErrorResponse(
      "AUTHORIZATION_ERROR",
      "Unauthorized user",
    );
  }
  const validated = validateInput(UpdateTaskSchema, updateTaskParams);
  if (!validated.success) {
    return validated;
  }

  const result = await updateTask({
    userId: session.user.id,
    updateTaskParams: validated.data,
  });
  revalidatePath("/s/project", "layout");
  return result;
}
