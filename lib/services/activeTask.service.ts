import client from "@/lib/prisma";
import {
  createServiceErrorResponse,
  createSuccessResponseWithData,
  serviceAction,
  serviceQuery,
  serviceQueryOrNotFound,
} from "./serviceUtil";
import { emitStartedOnce } from "./startedEvent";
import { calculateDurationInSeconds } from "../util";

export function getActiveTimer({ userId }: { userId: string }) {
  return serviceQuery(
    () =>
      client.activeTimer.findUnique({
        where: { userId },
        include: { task: { select: { title: true } } },
      }),
    "Failed to fetch active timer",
  );
}

export function changeActiveTimerStart({
  userId,
  newStart,
}: {
  userId: string;
  newStart: Date;
}) {
  return serviceQueryOrNotFound(
    () =>
      client.activeTimer.update({
        where: { userId },
        data: { startedAt: newStart },
      }),
    "No active timer found",
    "Failed to change active timer start",
  );
}

export function startActiveTimer({
  userId,
  taskId,
}: {
  userId: string;
  taskId: string;
}) {
  return serviceAction(async () => {
    // TODO: Replace with project membership/role check when collaboration is implemented
    const task = await client.task.findUnique({
      where: { id: taskId, deletedAt: null },
      select: { createdById: true, archivedAt: true },
    });
    if (!task) return createServiceErrorResponse("NOT_FOUND", "Task not found");
    if (task.createdById !== userId)
      return createServiceErrorResponse(
        "AUTHORIZATION_ERROR",
        "User does not have access to this task",
      );
    // Archive is frozen state: an archived subtree must hold no running timer
    // (the reverse direction of archiveTask's running-descendant-timer block).
    if (task.archivedAt)
      return createServiceErrorResponse(
        "VALIDATION_ERROR",
        "Cannot start a timer on an archived task",
      );

    const result = await client.$transaction(async (tx) => {
      const now = new Date();

      const existingTimer = await tx.activeTimer.findUnique({
        where: { userId },
      });

      let createdTimeEntry = null;
      if (existingTimer) {
        createdTimeEntry = await tx.timeEntry.create({
          data: {
            task: { connect: { id: existingTimer.taskId } },
            user: { connect: { id: userId } },
            startedAt: existingTimer.startedAt,
            stoppedAt: now,
            duration: calculateDurationInSeconds(existingTimer.startedAt, now),
          },
        });
        await tx.activeTimer.delete({ where: { userId } });
      }

      const newActiveTimer = await tx.activeTimer.create({
        data: { userId, taskId, startedAt: now },
      });

      // Record the task's first work; no-op if a STARTED already exists (#55).
      await emitStartedOnce(tx, { taskId, userId, startedAt: now });

      return { activeTimer: newActiveTimer, timeEntry: createdTimeEntry };
    });

    return createSuccessResponseWithData(result);
  }, "Failed to start active timer");
}

export function stopActiveTimer({ userId }: { userId: string }) {
  return serviceAction(async () => {
    const existingTimer = await client.activeTimer.findUnique({
      where: { userId },
    });
    if (!existingTimer)
      return createServiceErrorResponse(
        "NOT_FOUND",
        "No active timer found for user",
      );

    const result = await client.$transaction(async (tx) => {
      const now = new Date();
      const createdTimeEntry = await tx.timeEntry.create({
        data: {
          task: { connect: { id: existingTimer.taskId } },
          user: { connect: { id: userId } },
          startedAt: existingTimer.startedAt,
          stoppedAt: now,
          duration: calculateDurationInSeconds(existingTimer.startedAt, now),
        },
      });

      await tx.activeTimer.delete({ where: { userId } });

      return createdTimeEntry;
    });

    return createSuccessResponseWithData(result);
  }, "Failed to stop active timer");
}
