import {
  createServiceErrorResponse,
  createSuccessResponseWithData,
  serviceAction,
} from "./serviceUtil";
import client from "@/lib/prisma";
import { calculateDurationInSeconds } from "../util";

export function startTimeEntry({
  userId,
  taskId,
}: {
  userId: string;
  taskId: string;
}) {
  return serviceAction(async () => {
    // TODO: Replace with project membership/role check when collaboration is implemented
    const task = await client.task.findUnique({
      where: { id: taskId },
      select: { createdById: true },
    });
    if (!task) return createServiceErrorResponse("NOT_FOUND", "Task not found");
    if (task.createdById !== userId)
      return createServiceErrorResponse(
        "AUTHORIZATION_ERROR",
        "User does not have access to this task",
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

      return { activeTimer: newActiveTimer, timeEntry: createdTimeEntry };
    });

    return createSuccessResponseWithData(result);
  }, "Failed to start time entry");
}

export function stopTimeEntry({ userId }: { userId: string }) {
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
  }, "Failed to stop time entry");
}
