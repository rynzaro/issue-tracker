"use server";

import { auth } from "@/auth";
import { CreateTaskParams, CreateTaskSchema } from "../schema/task";
import {
  createServiceErrorResponse,
  validateInput,
} from "../services/serviceUtil";
import { createTask } from "../services/task.service";
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
  revalidatePath("/s/main");
  return result;
}
