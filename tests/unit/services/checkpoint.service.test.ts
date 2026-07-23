import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockPrismaClient,
  mockTx,
  type MockPrismaClient,
  type MockTx,
} from "@/tests/helpers/prisma-mock";
import { buildTask, buildProject } from "@/tests/helpers/factories";

vi.mock("@/lib/prisma", () => {
  const mock = createMockPrismaClient();
  return { default: mock };
});

import {
  createCheckpoint,
  getCheckpointsForTask,
} from "@/lib/services/checkpoint.service";
import prisma from "@/lib/prisma";

const db = prisma as unknown as MockPrismaClient;
const tx = mockTx as MockTx;

const ownerId = "owner-1";
const memberId = "member-1";
const strangerId = "stranger-1";
const projectId = "project-1";
const taskId = "task-1";

beforeEach(() => {
  vi.clearAllMocks();
});

function buildTaskRow(overrides: Record<string, unknown> = {}) {
  return buildTask({
    id: taskId,
    projectId,
    createdById: ownerId,
    project: { userId: ownerId },
    members: [],
    ...overrides,
  });
}

describe("createCheckpoint", () => {
  it("creates a checkpoint when principal is the project owner", async () => {
    db.project.findUnique.mockResolvedValue(
      buildProject({ id: projectId, userId: ownerId }),
    );
    db.task.findUnique.mockResolvedValue(buildTaskRow());
    db.$transaction.mockImplementation((fn: any) => fn(tx));
    tx.checkpoint.create.mockResolvedValue({
      id: "checkpoint-1",
      taskId,
      createdById: ownerId,
      trigger: "MANUAL",
      createdAt: new Date(),
    });

    const result = await createCheckpoint({
      principal: { userId: ownerId },
      projectId,
      taskId,
      trigger: "MANUAL",
      childCount: 1,
      estimatedTotal: 60,
      trackedTotal: 120,
      ownEstimate: 30,
      newChildrenSinceBaseline: 0,
      children: [
        {
          taskId: "child-1",
          title: "Child",
          estimate: 30,
          trackedSoFar: 120,
          existedAtBaseline: true,
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.createdById).toBe(ownerId);
    }
    expect(tx.checkpoint.create).toHaveBeenCalled();
  });

  it("creates a checkpoint when principal is the task creator", async () => {
    db.project.findUnique.mockResolvedValue(
      buildProject({ id: projectId, userId: ownerId }),
    );
    db.task.findUnique.mockResolvedValue(
      buildTaskRow({ createdById: memberId }),
    );
    db.$transaction.mockImplementation((fn: any) => fn(tx));
    tx.checkpoint.create.mockResolvedValue({
      id: "checkpoint-1",
      taskId,
      createdById: memberId,
      trigger: "WORK_STARTED",
      createdAt: new Date(),
    });

    const result = await createCheckpoint({
      principal: { userId: memberId },
      projectId,
      taskId,
      trigger: "WORK_STARTED",
      childCount: 0,
      estimatedTotal: null,
      trackedTotal: 0,
      ownEstimate: null,
      newChildrenSinceBaseline: 0,
      children: [],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.createdById).toBe(memberId);
    }
  });

  it("returns NOT_FOUND when principal cannot read the task", async () => {
    db.project.findUnique.mockResolvedValue(
      buildProject({ id: projectId, userId: ownerId }),
    );
    db.task.findUnique.mockResolvedValue(buildTaskRow());

    const result = await createCheckpoint({
      principal: { userId: strangerId },
      projectId,
      taskId,
      trigger: "MANUAL",
      childCount: 0,
      estimatedTotal: null,
      trackedTotal: 0,
      ownEstimate: null,
      newChildrenSinceBaseline: 0,
      children: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND when project does not exist", async () => {
    db.project.findUnique.mockResolvedValue(null);

    const result = await createCheckpoint({
      principal: { userId: ownerId },
      projectId,
      taskId,
      trigger: "MANUAL",
      childCount: 0,
      estimatedTotal: null,
      trackedTotal: 0,
      ownEstimate: null,
      newChildrenSinceBaseline: 0,
      children: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });
});

describe("getCheckpointsForTask", () => {
  it("returns all checkpoints for project owner", async () => {
    db.task.findUnique.mockResolvedValue(buildTaskRow());
    db.checkpoint.findMany.mockResolvedValue([
      { id: "cp-1", createdById: memberId, trigger: "WORK_STARTED" },
      { id: "cp-2", createdById: ownerId, trigger: "MANUAL" },
    ]);

    const result = await getCheckpointsForTask({
      principal: { userId: ownerId },
      taskId,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
    expect(db.checkpoint.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { taskId } }),
    );
  });

  it("returns all checkpoints when principal is the task creator", async () => {
    db.task.findUnique.mockResolvedValue(
      buildTaskRow({ createdById: memberId, project: { userId: "other-owner" } }),
    );
    db.checkpoint.findMany.mockResolvedValue([
      { id: "cp-1", createdById: memberId, trigger: "WORK_STARTED" },
      { id: "cp-2", createdById: ownerId, trigger: "MANUAL" },
    ]);

    const result = await getCheckpointsForTask({
      principal: { userId: memberId },
      taskId,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
    expect(db.checkpoint.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { taskId },
      }),
    );
  });

  it("returns NOT_FOUND for a stranger", async () => {
    db.task.findUnique.mockResolvedValue(buildTaskRow());

    const result = await getCheckpointsForTask({
      principal: { userId: strangerId },
      taskId,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
    expect(db.checkpoint.findMany).not.toHaveBeenCalled();
  });
});
