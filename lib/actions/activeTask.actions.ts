"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import z from "zod";
import {
  createServiceErrorResponse,
  validateInput,
} from "../services/serviceUtil";
import {
  changeActiveTimerStart,
  startActiveTimer,
  stopActiveTimer,
} from "../services/activeTask.service";

const ChangeActiveTimerStartSchema = z.object({
  newStart: z.coerce.date(),
});

const StartActiveTimerSchema = z.object({
  taskId: z.cuid(),
});

// Timer start/stop actions (Iteration 1)
export async function startActiveTimerAction({ taskId }: { taskId: string }) {
  const session = await auth();
  if (!session?.user?.id) {
    return createServiceErrorResponse(
      "AUTHORIZATION_ERROR",
      "Unauthorized user",
    );
  }

  const validated = validateInput(StartActiveTimerSchema, { taskId });
  if (!validated.success) return validated;

  const result = await startActiveTimer({
    userId: session.user.id,
    taskId: validated.data.taskId,
  });
  if (result.success) revalidatePath("/s/project", "layout");
  return result;
}

export async function stopActiveTimerAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return createServiceErrorResponse(
      "AUTHORIZATION_ERROR",
      "Unauthorized user",
    );
  }

  const result = await stopActiveTimer({
    userId: session.user.id,
  });
  if (result.success) revalidatePath("/s/project", "layout");
  return result;
}

export async function changeActiveTimerStartAction({
  newStart,
}: {
  newStart: Date;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return createServiceErrorResponse(
      "AUTHORIZATION_ERROR",
      "Unauthorized user",
    );
  }

  const validated = validateInput(ChangeActiveTimerStartSchema, { newStart });
  if (!validated.success) return validated;

  const result = await changeActiveTimerStart({
    userId: session.user.id,
    newStart: validated.data.newStart,
  });
  if (result.success) revalidatePath("/s/project", "layout");
  return result;
}
