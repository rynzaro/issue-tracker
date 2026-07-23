import { Prisma, type CheckpointTrigger as PrismaCheckpointTrigger } from "@prisma/client";
import client from "@/lib/prisma";
import { assertCan } from "@/lib/authz/policy";
import {
  createServiceErrorResponse,
  createSuccessResponseWithData,
  serviceAction,
} from "./serviceUtil";

/**
 * Per-principal checkpoints (D-05 / ADR-0023).
 *
 * Every `Checkpoint` row carries `createdById` — the principal whose settled
 * judgement it records. A Task Member's plan/reality stream is separate from
 * the host owner's stream. When this module is implemented:
 *
 * - A `SCOPE_CHANGE` by a member under a host task writes the **member's** plan
 *   checkpoint on the host. The new child appears in the owner's parent
 *   cross-section only as a fact, not the owner's belief.
 * - A member's `WORK_STARTED` on their own subtask is the member's baseline;
 *   it does **not** close the host owner's plan debounce window.
 * - A member's `TASK_COMPLETED` on their own subtask fires a reality checkpoint
 *   on the host, authored by the member.
 *
 * The caller must supply the acting principal; the service must never default to
 * `project.userId` as the checkpoint author.
 */

export type Principal = { userId: string };

export type CheckpointTrigger =
  | "MANUAL"
  | "WORK_STARTED"
  | "SCOPE_CHANGE"
  | "ESTIMATE_CHANGE"
  | "TASK_COMPLETED";

const TRIGGER_MAP: Record<CheckpointTrigger, PrismaCheckpointTrigger> = {
  MANUAL: "MANUAL",
  WORK_STARTED: "WORK_STARTED",
  SCOPE_CHANGE: "SCOPE_CHANGE",
  ESTIMATE_CHANGE: "ESTIMATE_CHANGE",
  TASK_COMPLETED: "TASK_COMPLETED",
};

export type CreateCheckpointResult = {
  id: string;
  taskId: string;
  createdById: string;
  trigger: CheckpointTrigger;
  createdAt: Date;
};

export type CheckpointChildInput = {
  taskId: string;
  title: string;
  estimate: number | null;
  trackedSoFar: number;
  existedAtBaseline: boolean;
  addedAtCheckpointId?: string | null;
};

export type CreateCheckpointInput = {
  principal: Principal;
  projectId: string;
  taskId: string;
  trigger: CheckpointTrigger;
  label?: string | null;
  childCount: number;
  estimatedTotal: number | null;
  trackedTotal: number;
  ownEstimate: number | null;
  newChildrenSinceBaseline: number;
  children: CheckpointChildInput[];
};

/**
 * Create a checkpoint authored by the acting principal.
 *
 * Authorization: the principal must be able to `task:read` the target task
 * (project owner, task creator, or task member on the host). A Task Member
 * may only create checkpoints for tasks in their visible host subtree.
 *
 * The implementation is intentionally minimal — it writes a single checkpoint
 * with its child rows and does not yet handle debounce, baseline uniqueness,
 * or trigger-time aggregation. Those belong to Iteration 3.
 */
export function createCheckpoint(input: CreateCheckpointInput) {
  return serviceAction(async () => {
    const { principal, projectId, taskId } = input;

    const project = await client.project.findUnique({
      where: { id: projectId, deletedAt: null },
      select: { userId: true },
    });
    if (!project) {
      return createServiceErrorResponse("NOT_FOUND", "Project not found");
    }

    const task = await client.task.findUnique({
      where: { id: taskId, deletedAt: null },
      select: {
        id: true,
        createdById: true,
        project: { select: { userId: true } },
        members: { select: { userId: true } },
      },
    });
    if (!task) {
      return createServiceErrorResponse("NOT_FOUND", "Task not found");
    }

    const auth = assertCan(
      { userId: principal.userId },
      "task:read",
      {
        project: task.project,
        createdById: task.createdById,
        memberIds: (task.members ?? []).map((m) => m.userId),
      },
    );
    if (auth) return auth;

    const checkpoint = await client.$transaction(async (tx) => {
      const created = await tx.checkpoint.create({
        data: {
          project: { connect: { id: projectId } },
          task: { connect: { id: taskId } },
          createdBy: { connect: { id: principal.userId } },
          trigger: TRIGGER_MAP[input.trigger],
          label: input.label ?? undefined,
          childCount: input.childCount,
          estimatedTotal: input.estimatedTotal,
          trackedTotal: input.trackedTotal,
          ownEstimate: input.ownEstimate,
          newChildrenSinceBaseline: input.newChildrenSinceBaseline,
          checkpointTasks: {
            create: input.children.map((child) => ({
              task: { connect: { id: child.taskId } },
              title: child.title,
              estimate: child.estimate,
              trackedSoFar: child.trackedSoFar,
              existedAtBaseline: child.existedAtBaseline,
              ...(child.addedAtCheckpointId
                ? {
                    addedAtCheckpoint: {
                      connect: { id: child.addedAtCheckpointId },
                    },
                  }
                : {}),
            })),
          },
        },
      });
      return created;
    });

    return createSuccessResponseWithData<CreateCheckpointResult>({
      id: checkpoint.id,
      taskId: checkpoint.taskId,
      createdById: checkpoint.createdById,
      trigger: input.trigger,
      createdAt: checkpoint.createdAt,
    });
  }, "Failed to create checkpoint");
}

/**
 * List checkpoints for a task visible to the principal.
 *
 * Returns only checkpoints authored by the principal when the principal is a
 * Task Member; project owners and task creators see every checkpoint on the
 * task. This preserves the per-principal stream boundary from D-05.
 */
export function getCheckpointsForTask({
  principal,
  taskId,
}: {
  principal: Principal;
  taskId: string;
}) {
  return serviceAction(async () => {
    const task = await client.task.findUnique({
      where: { id: taskId, deletedAt: null },
      select: {
        id: true,
        createdById: true,
        project: { select: { userId: true } },
        members: { select: { userId: true } },
      },
    });
    if (!task) {
      return createServiceErrorResponse("NOT_FOUND", "Task not found");
    }

    const auth = assertCan(
      { userId: principal.userId },
      "task:read",
      {
        project: task.project,
        createdById: task.createdById,
        memberIds: (task.members ?? []).map((m) => m.userId),
      },
    );
    if (auth) return auth;

    const isPrivileged =
      task.project.userId === principal.userId ||
      task.createdById === principal.userId;

    const checkpoints = await client.checkpoint.findMany({
      where: {
        taskId,
        ...(isPrivileged ? {} : { createdById: principal.userId }),
      },
      orderBy: { createdAt: "desc" },
      include: { checkpointTasks: true },
    });

    return createSuccessResponseWithData(checkpoints);
  }, "Failed to fetch checkpoints");
}
