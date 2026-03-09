"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import {
  createServiceErrorResponse,
  validateInput,
} from "../services/serviceUtil";
import {
  getTimeEntriesForTask,
  createManualTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
} from "../services/timeEntry.service";
import {
  CreateManualTimeEntrySchema,
  type CreateManualTimeEntryParams,
  UpdateTimeEntrySchema,
  type UpdateTimeEntryParams,
  GetTimeEntriesForTaskSchema,
  DeleteTimeEntrySchema,
} from "../schema/timeEntry";

// ─── Read ──────────────────────────────────────────────────────────────────────

export async function getTimeEntriesForTaskAction({
  taskId,
}: {
  taskId: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return createServiceErrorResponse(
      "AUTHORIZATION_ERROR",
      "Unauthorized user",
    );
  }

  const validated = validateInput(GetTimeEntriesForTaskSchema, { taskId });
  if (!validated.success) return validated;

  return getTimeEntriesForTask({
    userId: session.user.id,
    taskId: validated.data.taskId,
  });
}

// ─── Create ────────────────────────────────────────────────────────────────────

export async function createManualTimeEntryAction(
  params: CreateManualTimeEntryParams,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return createServiceErrorResponse(
      "AUTHORIZATION_ERROR",
      "Unauthorized user",
    );
  }

  const validated = validateInput(CreateManualTimeEntrySchema, params);
  if (!validated.success) return validated;

  const result = await createManualTimeEntry({
    userId: session.user.id,
    taskId: validated.data.taskId,
    startedAt: validated.data.startedAt,
    stoppedAt: validated.data.stoppedAt,
  });
  if (result.success) revalidatePath("/s/project", "layout");
  return result;
}

// ─── Update ────────────────────────────────────────────────────────────────────

export async function updateTimeEntryAction(params: UpdateTimeEntryParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return createServiceErrorResponse(
      "AUTHORIZATION_ERROR",
      "Unauthorized user",
    );
  }

  const validated = validateInput(UpdateTimeEntrySchema, params);
  if (!validated.success) return validated;

  const result = await updateTimeEntry({
    userId: session.user.id,
    timeEntryId: validated.data.timeEntryId,
    startedAt: validated.data.startedAt,
    stoppedAt: validated.data.stoppedAt,
  });
  if (result.success) revalidatePath("/s/project", "layout");
  return result;
}

// ─── Delete ────────────────────────────────────────────────────────────────────

export async function deleteTimeEntryAction({
  timeEntryId,
}: {
  timeEntryId: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return createServiceErrorResponse(
      "AUTHORIZATION_ERROR",
      "Unauthorized user",
    );
  }

  const validated = validateInput(DeleteTimeEntrySchema, { timeEntryId });
  if (!validated.success) return validated;

  const result = await deleteTimeEntry({
    userId: session.user.id,
    timeEntryId: validated.data.timeEntryId,
  });
  if (result.success) revalidatePath("/s/project", "layout");
  return result;
}
