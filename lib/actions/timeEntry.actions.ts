"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { createServiceErrorResponse } from "../services/serviceUtil";
import { startTimeEntry, stopTimeEntry } from "../services/timeEntry.service";

// Timer start/stop actions (Iteration 1)
export async function startTimeEntryAction({ taskId }: { taskId: string }) {
  const session = await auth();
  if (!session?.user?.id) {
    return createServiceErrorResponse(
      "AUTHORIZATION_ERROR",
      "Unauthorized user",
    );
  }

  const result = await startTimeEntry({
    userId: session.user.id,
    taskId,
  });
  revalidatePath("/s/project", "layout");
  return result;
}

export async function stopTimeEntryAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return createServiceErrorResponse(
      "AUTHORIZATION_ERROR",
      "Unauthorized user",
    );
  }

  const result = await stopTimeEntry({
    userId: session.user.id,
  });
  revalidatePath("/s/project", "layout");
  return result;
}
