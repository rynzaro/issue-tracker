import client from "@/lib/prisma";
import { assertCan } from "@/lib/authz/policy";
import { sendEmail } from "@/lib/email/email.service";
import {
  createServiceErrorResponse,
  createSuccessResponse,
  createSuccessResponseWithData,
  serviceAction,
} from "./serviceUtil";

/**
 * Returns the set of task ids a user may see inside a project.
 * - Project owner: every task in the project.
 * - Task Member: the host task they are added to and all its descendants.
 */
export async function getVisibleTaskIds(
  projectId: string,
  userId: string,
  db: Pick<typeof client, "project" | "task" | "taskMember"> = client,
): Promise<Set<string> | null> {
  const project = await db.project.findUnique({
    where: { id: projectId, deletedAt: null },
    select: { userId: true },
  });
  if (!project) return null;

  if (project.userId === userId) {
    const allTasks = await db.task.findMany({
      where: { projectId, deletedAt: null },
      select: { id: true },
    });
    return new Set(allTasks.map((t) => t.id));
  }

  const memberships = (await db.taskMember.findMany({
    where: { userId, task: { projectId } },
    select: { taskId: true },
  })) ?? [];

  const visibleIds = new Set<string>();
  for (const { taskId } of memberships) {
    visibleIds.add(taskId);
    const descendants = await collectDescendantIds(
      db,
      taskId,
      projectId,
      true,
      true,
    );
    for (const id of descendants) visibleIds.add(id);
  }

  return visibleIds;
}

export type AddTaskMemberResult = {
  id: string;
  taskId: string;
  userId: string;
  createdAt: Date;
};

export function addTaskMember({
  taskId,
  memberUserId,
  ownerUserId,
}: {
  taskId: string;
  memberUserId: string;
  ownerUserId: string;
}) {
  return serviceAction(async () => {
    const task = await client.task.findUnique({
      where: { id: taskId, deletedAt: null },
      select: {
        id: true,
        projectId: true,
        project: { select: { userId: true } },
      },
    });
    if (!task) {
      return createServiceErrorResponse("NOT_FOUND", "Task not found");
    }

    const auth = assertCan(
      { userId: ownerUserId },
      "project:update",
      task.project,
    );
    if (auth) return auth;

    const targetUser = await client.user.findUnique({
      where: { id: memberUserId },
      select: { id: true, email: true },
    });
    if (!targetUser) {
      return createServiceErrorResponse("NOT_FOUND", "User not found");
    }

    const existing = await client.taskMember.findUnique({
      where: { taskId_userId: { taskId, userId: memberUserId } },
    });
    if (existing) {
      return createServiceErrorResponse(
        "VALIDATION_ERROR",
        "User is already a member of this task",
      );
    }

    const membership = await client.taskMember.create({
      data: {
        task: { connect: { id: taskId } },
        user: { connect: { id: memberUserId } },
      },
    });

    if (targetUser.email) {
      void sendEmail({
        to: targetUser.email,
        subject: "You were added to a task",
        text: `You have been added as a collaborator to a task. Open it to see the details.`,
      });
    }

    return createSuccessResponseWithData<AddTaskMemberResult>({
      id: membership.id,
      taskId: membership.taskId,
      userId: membership.userId,
      createdAt: membership.createdAt,
    });
  }, "Failed to add task member");
}

export function removeTaskMember({
  taskId,
  memberUserId,
  ownerUserId,
}: {
  taskId: string;
  memberUserId: string;
  ownerUserId: string;
}) {
  return serviceAction(async () => {
    const task = await client.task.findUnique({
      where: { id: taskId, deletedAt: null },
      select: {
        id: true,
        projectId: true,
        project: { select: { userId: true } },
      },
    });
    if (!task) {
      return createServiceErrorResponse("NOT_FOUND", "Task not found");
    }

    const auth = assertCan(
      { userId: ownerUserId },
      "project:update",
      task.project,
    );
    if (auth) return auth;

    const membership = await client.taskMember.findUnique({
      where: { taskId_userId: { taskId, userId: memberUserId } },
    });
    if (!membership) {
      return createServiceErrorResponse(
        "NOT_FOUND",
        "Task membership not found",
      );
    }

    const removedCount = await client.$transaction(async (tx) => {
      // Collect the host subtree, then keep only tasks authored by the member
      // and their descendants.
      const hostDescendants = await collectDescendantIds(
        tx,
        taskId,
        task.projectId,
        true,
        true,
      );

      const memberTaskIds = (
        await tx.task.findMany({
          where: {
            id: { in: hostDescendants },
            createdById: memberUserId,
            deletedAt: null,
          },
          select: { id: true },
        })
      ).map((t) => t.id);

      const descendantIds: string[] = [];
      for (const id of memberTaskIds) {
        const nodes = await collectDescendantIds(
          tx,
          id,
          task.projectId,
          true,
          true,
        );
        descendantIds.push(...nodes);
      }

      const taskIdsToDelete = Array.from(
        new Set([...memberTaskIds, ...descendantIds]),
      );

      if (taskIdsToDelete.length > 0) {
        await tx.task.updateMany({
          where: { id: { in: taskIdsToDelete } },
          data: { deletedAt: new Date() },
        });

        await tx.activeTimer.deleteMany({
          where: {
            userId: memberUserId,
            taskId: { in: taskIdsToDelete },
          },
        });

        await tx.timeEntry.updateMany({
          where: {
            userId: memberUserId,
            taskId: { in: taskIdsToDelete },
          },
          data: { deletedAt: new Date() },
        });
      }

      await tx.taskMember.delete({
        where: { taskId_userId: { taskId, userId: memberUserId } },
      });

      return taskIdsToDelete.length;
    });

    return createSuccessResponseWithData({ removedCount });
  }, "Failed to remove task member");
}

/**
 * BFS collecting a task and all its descendants within a project.
 * Mirrors the helper in task.service.ts; kept separate to avoid a server-only
 * import chain into this module.
 */
async function collectDescendantIds(
  db: Pick<typeof client, "task">,
  taskId: string,
  projectId: string,
  includeArchived = false,
  includeDeleted = false,
): Promise<string[]> {
  const projectTasks = await db.task.findMany({
    where: {
      projectId,
      deletedAt: includeDeleted ? undefined : null,
      archivedAt: includeArchived ? undefined : null,
    },
    select: { id: true, parentId: true },
  });

  const childrenMap = new Map<string, string[]>();
  for (const t of projectTasks) {
    if (t.parentId) {
      if (!childrenMap.has(t.parentId)) childrenMap.set(t.parentId, []);
      childrenMap.get(t.parentId)!.push(t.id);
    }
  }

  const ids: string[] = [];
  const queue = [taskId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    ids.push(current);
    queue.push(...(childrenMap.get(current) ?? []));
  }
  return ids;
}
