"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { createServiceErrorResponse } from "../services/serviceUtil";
import {
  changeActiveTimerStart,
  startActiveTimer,
  stopActiveTimer,
} from "../services/activeTask.service";

// Timer start/stop actions (Iteration 1)
export async function startActiveTimerAction({ taskId }: { taskId: string }) {
  const session = await auth();
  if (!session?.user?.id) {
    return createServiceErrorResponse(
      "AUTHORIZATION_ERROR",
      "Unauthorized user",
    );
  }

  const result = await startActiveTimer({
    userId: session.user.id,
    taskId,
  });
  revalidatePath("/s/project", "layout");
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
  revalidatePath("/s/project", "layout");
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

  const result = await changeActiveTimerStart({
    userId: session.user.id,
    newStart,
  });
  return result;
}
