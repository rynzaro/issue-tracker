"use server";

import { auth } from "@/auth";
import {
  CreateTaskParams,
  CreateTaskSchema,
  UpdateTaskParams,
  UpdateTaskSchema,
  DeleteTaskSchema,
  CompleteTaskSchema,
  UncompleteTaskSchema,
  ArchiveTaskSchema,
  UnarchiveTaskSchema,
  RestoreDeletedTaskSchema,
} from "../schema/task";
import {
  createServiceErrorResponse,
  validateInput,
} from "../services/serviceUtil";
import {
  createTask,
  deleteTask,
  updateTask,
  completeTask,
  uncompleteTask,
  archiveTask,
  unarchiveTask,
  restoreDeletedTask,
} from "../services/task.service";
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
  if (result.success) revalidatePath("/s/project", "layout");
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
  if (result.success) revalidatePath("/s/project", "layout");
  return result;
}

export async function deleteTaskAction({ taskId }: { taskId: string }) {
  const session = await auth();
  if (!session?.user?.id) {
    return createServiceErrorResponse(
      "AUTHORIZATION_ERROR",
      "Unauthorized user",
    );
  }

  const validated = validateInput(DeleteTaskSchema, { taskId });
  if (!validated.success) return validated;

  const result = await deleteTask({
    taskId: validated.data.taskId,
    userId: session.user.id,
  });

  if (result.success) revalidatePath("/s/project", "layout");
  return result;
}

export async function completeTaskAction({ taskId }: { taskId: string }) {
  const session = await auth();
  if (!session?.user?.id) {
    return createServiceErrorResponse(
      "AUTHORIZATION_ERROR",
      "Unauthorized user",
    );
  }

  const validated = validateInput(CompleteTaskSchema, { taskId });
  if (!validated.success) return validated;

  const result = await completeTask({
    taskId: validated.data.taskId,
    userId: session.user.id,
  });

  if (result.success) revalidatePath("/s/project", "layout");
  return result;
}

export async function uncompleteTaskAction({ taskId }: { taskId: string }) {
  const session = await auth();
  if (!session?.user?.id) {
    return createServiceErrorResponse(
      "AUTHORIZATION_ERROR",
      "Unauthorized user",
    );
  }

  const validated = validateInput(UncompleteTaskSchema, { taskId });
  if (!validated.success) return validated;

  const result = await uncompleteTask({
    taskId: validated.data.taskId,
    userId: session.user.id,
  });

  if (result.success) revalidatePath("/s/project", "layout");
  return result;
}

export async function archiveTaskAction({ taskId }: { taskId: string }) {
  const session = await auth();
  if (!session?.user?.id) {
    return createServiceErrorResponse(
      "AUTHORIZATION_ERROR",
      "Unauthorized user",
    );
  }

  const validated = validateInput(ArchiveTaskSchema, { taskId });
  if (!validated.success) return validated;

  const result = await archiveTask({
    taskId: validated.data.taskId,
    userId: session.user.id,
  });

  if (result.success) revalidatePath("/s/project", "layout");
  return result;
}

export async function unarchiveTaskAction({ taskId }: { taskId: string }) {
  const session = await auth();
  if (!session?.user?.id) {
    return createServiceErrorResponse(
      "AUTHORIZATION_ERROR",
      "Unauthorized user",
    );
  }

  const validated = validateInput(UnarchiveTaskSchema, { taskId });
  if (!validated.success) return validated;

  const result = await unarchiveTask({
    taskId: validated.data.taskId,
    userId: session.user.id,
  });

  if (result.success) revalidatePath("/s/project", "layout");
  return result;
}

export async function restoreDeletedTaskAction({ taskId }: { taskId: string }) {
  const session = await auth();
  if (!session?.user?.id) {
    return createServiceErrorResponse(
      "AUTHORIZATION_ERROR",
      "Unauthorized user",
    );
  }

  const validated = validateInput(RestoreDeletedTaskSchema, { taskId });
  if (!validated.success) return validated;

  const result = await restoreDeletedTask({
    taskId: validated.data.taskId,
    userId: session.user.id,
  });

  if (result.success) revalidatePath("/s/project", "layout");
  return result;
}
