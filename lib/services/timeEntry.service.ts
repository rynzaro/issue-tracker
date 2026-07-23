import client from "@/lib/prisma";
import {
  createServiceErrorResponse,
  createSuccessResponseWithData,
  serviceAction,
} from "./serviceUtil";
import { emitStartedOnce } from "./startedEvent";
import { assertCan } from "@/lib/authz/policy";
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
      select: {
        createdById: true,
        project: { select: { userId: true } },
        members: { select: { userId: true } },
      },
    });
    if (!task) return createServiceErrorResponse("NOT_FOUND", "Task not found");

    const entries = await client.timeEntry.findMany({
      where: { taskId, deletedAt: null },
      orderBy: { startedAt: "desc" },
    });

    // Filter server-side: owner or entry author sees entries. Others get an
    // empty list (they have no entries on this task, not NOT_FOUND).
    const visible = entries.filter((entry) => {
      const auth = assertCan(
        { userId },
        "timeEntry:read",
        {
          project: task.project,
          taskCreatedById: task.createdById,
          entryAuthorId: entry.userId,
        },
      );
      return !auth;
    });

    return createSuccessResponseWithData(visible);
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
      select: {
        createdById: true,
        project: { select: { userId: true } },
        members: { select: { userId: true } },
      },
    });
    if (!task) return createServiceErrorResponse("NOT_FOUND", "Task not found");

    const auth = assertCan(
      { userId },
      "timeEntry:create",
      {
        project: task.project,
        taskCreatedById: task.createdById,
        entryAuthorId: userId,
      },
    );
    if (auth) return auth;

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

    const task = await client.task.findUnique({
      where: { id: existing.taskId, deletedAt: null },
      select: {
        id: true,
        createdById: true,
        project: { select: { userId: true } },
        members: { select: { userId: true } },
      },
    });
    if (!task) return createServiceErrorResponse("NOT_FOUND", "Task not found");

    const auth = assertCan(
      { userId },
      "timeEntry:update",
      {
        project: task.project,
        taskCreatedById: task.createdById,
        entryAuthorId: existing.userId,
      },
    );
    if (auth) return auth;

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

    const task = await client.task.findUnique({
      where: { id: existing.taskId, deletedAt: null },
      select: {
        id: true,
        createdById: true,
        project: { select: { userId: true } },
        members: { select: { userId: true } },
      },
    });
    if (!task) return createServiceErrorResponse("NOT_FOUND", "Task not found");

    const auth = assertCan(
      { userId },
      "timeEntry:delete",
      {
        project: task.project,
        taskCreatedById: task.createdById,
        entryAuthorId: existing.userId,
      },
    );
    if (auth) return auth;

    await client.timeEntry.update({
      where: { id: timeEntryId },
      data: { deletedAt: new Date() },
    });

    return createSuccessResponseWithData(null);
  }, "Failed to delete time entry");
}
