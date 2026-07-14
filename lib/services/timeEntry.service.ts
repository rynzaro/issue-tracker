import client from "@/lib/prisma";
import {
  createServiceErrorResponse,
  createSuccessResponseWithData,
  serviceAction,
} from "./serviceUtil";
import { emitStartedOnce } from "./startedEvent";
import { calculateDurationInSeconds } from "../util";

// ─── Reads ─────────────────────────────────────────────────────────────────────

export function getTimeEntriesForTask({
  userId,
  taskId,
}: {
  userId: string;
  taskId: string;
}) {
  return serviceAction(async () => {
    const task = await client.task.findUnique({
      where: { id: taskId, deletedAt: null },
      select: { createdById: true },
    });
    if (!task) return createServiceErrorResponse("NOT_FOUND", "Task not found");
    if (task.createdById !== userId)
      return createServiceErrorResponse(
        "AUTHORIZATION_ERROR",
        "User does not have access to this task",
      );

    const entries = await client.timeEntry.findMany({
      where: { taskId },
      orderBy: { startedAt: "desc" },
    });

    return createSuccessResponseWithData(entries);
  }, "Failed to fetch time entries");
}

// ─── Mutations ─────────────────────────────────────────────────────────────────

export function createManualTimeEntry({
  userId,
  taskId,
  startedAt,
  stoppedAt,
}: {
  userId: string;
  taskId: string;
  startedAt: Date;
  stoppedAt: Date;
}) {
  return serviceAction(async () => {
    const task = await client.task.findUnique({
      where: { id: taskId, deletedAt: null },
      select: { createdById: true },
    });
    if (!task) return createServiceErrorResponse("NOT_FOUND", "Task not found");
    if (task.createdById !== userId)
      return createServiceErrorResponse(
        "AUTHORIZATION_ERROR",
        "User does not have access to this task",
      );

    // Transaction so the entry and any first-work STARTED event commit together
    // (emit failure rolls back the entry). This path was single-statement before #55.
    const entry = await client.$transaction(async (tx) => {
      const created = await tx.timeEntry.create({
        data: {
          task: { connect: { id: taskId } },
          user: { connect: { id: userId } },
          startedAt,
          stoppedAt,
          duration: calculateDurationInSeconds(startedAt, stoppedAt),
        },
      });

      // Record the task's first work; no-op if a STARTED already exists —
      // a backdated entry never moves or re-emits it (#55).
      await emitStartedOnce(tx, { taskId, userId, startedAt });

      return created;
    });

    return createSuccessResponseWithData(entry);
  }, "Failed to create time entry");
}

export function updateTimeEntry({
  userId,
  timeEntryId,
  startedAt,
  stoppedAt,
}: {
  userId: string;
  timeEntryId: string;
  startedAt: Date;
  stoppedAt: Date;
}) {
  return serviceAction(async () => {
    const existing = await client.timeEntry.findUnique({
      where: { id: timeEntryId },
    });
    if (!existing)
      return createServiceErrorResponse("NOT_FOUND", "Time entry not found");
    if (existing.userId !== userId)
      return createServiceErrorResponse(
        "AUTHORIZATION_ERROR",
        "User does not own this time entry",
      );

    const task = await client.task.findUnique({
      where: { id: existing.taskId, deletedAt: null },
      select: { id: true },
    });
    if (!task) return createServiceErrorResponse("NOT_FOUND", "Task not found");

    const updated = await client.timeEntry.update({
      where: { id: timeEntryId },
      data: {
        startedAt,
        stoppedAt,
        duration: calculateDurationInSeconds(startedAt, stoppedAt),
      },
    });

    return createSuccessResponseWithData(updated);
  }, "Failed to update time entry");
}

export function deleteTimeEntry({
  userId,
  timeEntryId,
}: {
  userId: string;
  timeEntryId: string;
}) {
  return serviceAction(async () => {
    const existing = await client.timeEntry.findUnique({
      where: { id: timeEntryId },
    });
    if (!existing)
      return createServiceErrorResponse("NOT_FOUND", "Time entry not found");
    if (existing.userId !== userId)
      return createServiceErrorResponse(
        "AUTHORIZATION_ERROR",
        "User does not own this time entry",
      );

    const task = await client.task.findUnique({
      where: { id: existing.taskId, deletedAt: null },
      select: { id: true },
    });
    if (!task) return createServiceErrorResponse("NOT_FOUND", "Task not found");

    await client.timeEntry.delete({
      where: { id: timeEntryId },
    });

    return createSuccessResponseWithData(null);
  }, "Failed to delete time entry");
}
