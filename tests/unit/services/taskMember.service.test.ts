import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockPrismaClient,
  mockTx,
  type MockPrismaClient,
  type MockTx,
} from "@/tests/helpers/prisma-mock";
import { buildUser, buildTask, buildProject } from "@/tests/helpers/factories";

vi.mock("@/lib/prisma", () => {
  const mock = createMockPrismaClient();
  return { default: mock };
});

import {
  addTaskMember,
  removeTaskMember,
  getVisibleTaskIds,
} from "@/lib/services/taskMember.service";
import prisma from "@/lib/prisma";

const db = prisma as unknown as MockPrismaClient;
const tx = mockTx as MockTx;

const ownerId = "owner-1";
const memberId = "member-1";
const strangerId = "stranger-1";
const projectId = "project-1";
const hostId = "host-1";
const childId = "child-1";
const grandchildId = "grandchild-1";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getVisibleTaskIds", () => {
  it("returns all task ids for the project owner", async () => {
    db.project.findUnique.mockResolvedValue(buildProject({ userId: "owner-1" }));
    db.task.findMany.mockResolvedValue([
      { id: "task-1" },
      { id: "task-2" },
    ]);

    const result = await getVisibleTaskIds("test-project-1", "owner-1");

    expect(result).toEqual(new Set(["task-1", "task-2"]));
  });

  it("returns host + descendants for a Task Member", async () => {
    const ownerId = "owner-1";
    const memberId = "member-1";
    const hostId = "host-task";
    const childId = "member-child";
    const siblingId = "owner-sibling";

    db.project.findUnique.mockResolvedValue(
      buildProject({ userId: ownerId }),
    );
    db.taskMember.findMany.mockResolvedValue([{ taskId: hostId }]);
    db.task.findMany
      .mockResolvedValueOnce([
        { id: hostId, parentId: null },
        { id: childId, parentId: hostId },
        { id: siblingId, parentId: null },
      ])
      .mockResolvedValueOnce([
        buildTask({ id: childId, createdById: memberId }),
      ])
      .mockResolvedValueOnce([{ id: childId, parentId: hostId }]);

    const result = await getVisibleTaskIds("test-project-1", memberId);

    expect(result).toEqual(new Set([hostId, childId]));
  });

  it("returns null when project does not exist", async () => {
    db.project.findUnique.mockResolvedValue(null);

    const result = await getVisibleTaskIds("missing-project", "user-1");

    expect(result).toBeNull();
  });
});

describe("addTaskMember", () => {
  it("adds a member when caller is the project owner", async () => {
    db.task.findUnique.mockResolvedValue(
      buildTask({
        id: hostId,
        projectId,
        createdById: ownerId,
        project: { userId: ownerId },
      }),
    );
    db.user.findUnique.mockResolvedValue(buildUser({ id: memberId }));
    db.taskMember.findUnique.mockResolvedValue(null);
    db.taskMember.create.mockResolvedValue({
      id: "membership-1",
      taskId: hostId,
      userId: memberId,
      createdAt: new Date(),
    });

    const result = await addTaskMember({
      taskId: hostId,
      memberUserId: memberId,
      ownerUserId: ownerId,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userId).toBe(memberId);
    }
    expect(db.taskMember.create).toHaveBeenCalled();
  });

  it("returns NOT_FOUND when task does not exist", async () => {
    db.task.findUnique.mockResolvedValue(null);

    const result = await addTaskMember({
      taskId: hostId,
      memberUserId: memberId,
      ownerUserId: ownerId,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });

  it("returns NOT_FOUND when caller is not the project owner", async () => {
    db.task.findUnique.mockResolvedValue(
      buildTask({
        id: hostId,
        projectId,
        createdById: ownerId,
        project: { userId: ownerId },
      }),
    );

    const result = await addTaskMember({
      taskId: hostId,
      memberUserId: memberId,
      ownerUserId: strangerId,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });

  it("returns VALIDATION_ERROR when user is already a member", async () => {
    db.task.findUnique.mockResolvedValue(
      buildTask({
        id: hostId,
        projectId,
        createdById: ownerId,
        project: { userId: ownerId },
      }),
    );
    db.user.findUnique.mockResolvedValue(buildUser({ id: memberId }));
    db.taskMember.findUnique.mockResolvedValue({
      id: "membership-1",
      taskId: hostId,
      userId: memberId,
      createdAt: new Date(),
    });

    const result = await addTaskMember({
      taskId: hostId,
      memberUserId: memberId,
      ownerUserId: ownerId,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });
});

describe("removeTaskMember", () => {
  it("removes membership and soft-deletes member subtree and time entries", async () => {
    db.task.findUnique.mockResolvedValue(
      buildTask({
        id: hostId,
        projectId,
        createdById: ownerId,
        project: { userId: ownerId },
      }),
    );
    db.taskMember.findUnique.mockResolvedValue({
      id: "membership-1",
      taskId: hostId,
      userId: memberId,
      createdAt: new Date(),
    });

    tx.task.findMany
      .mockResolvedValueOnce([
        { id: hostId, parentId: null },
        { id: childId, parentId: hostId },
        { id: grandchildId, parentId: childId },
      ])
      .mockResolvedValueOnce([
        buildTask({ id: childId, createdById: memberId }),
        buildTask({ id: grandchildId, createdById: memberId }),
      ])
      .mockResolvedValueOnce([
        { id: childId, parentId: hostId },
        { id: grandchildId, parentId: childId },
      ])
      .mockResolvedValueOnce([
        { id: grandchildId, parentId: childId },
      ]);

    tx.task.updateMany.mockResolvedValue({ count: 2 });
    tx.activeTimer.deleteMany.mockResolvedValue({ count: 0 });
    tx.timeEntry.updateMany.mockResolvedValue({ count: 1 });
    tx.taskMember.delete.mockResolvedValue({
      id: "membership-1",
      taskId: hostId,
      userId: memberId,
    });

    const result = await removeTaskMember({
      taskId: hostId,
      memberUserId: memberId,
      ownerUserId: ownerId,
    });

    expect(result.success).toBe(true);
    expect(tx.task.updateMany).toHaveBeenCalledWith({
      where: { id: { in: expect.arrayContaining([childId, grandchildId]) } },
      data: { deletedAt: expect.any(Date) },
    });
    expect(tx.timeEntry.updateMany).toHaveBeenCalledWith({
      where: {
        userId: memberId,
        taskId: { in: expect.arrayContaining([childId, grandchildId]) },
      },
      data: { deletedAt: expect.any(Date) },
    });
    expect(tx.taskMember.delete).toHaveBeenCalled();
  });

  it("does not delete owner-created tasks in the host subtree", async () => {
    db.task.findUnique.mockResolvedValue(
      buildTask({
        id: hostId,
        projectId,
        createdById: ownerId,
        project: { userId: ownerId },
      }),
    );
    db.taskMember.findUnique.mockResolvedValue({
      id: "membership-1",
      taskId: hostId,
      userId: memberId,
    });

    // Host -> ownerChild (owner) and memberChild (member)
    tx.task.findMany
      .mockResolvedValueOnce([
        { id: hostId, parentId: null },
        { id: "owner-child", parentId: hostId },
        { id: "member-child", parentId: hostId },
      ])
      .mockResolvedValueOnce([
        buildTask({ id: "member-child", createdById: memberId }),
      ])
      .mockResolvedValueOnce([
        { id: "member-child", parentId: hostId },
      ]);

    tx.task.updateMany.mockResolvedValue({ count: 1 });
    tx.activeTimer.deleteMany.mockResolvedValue({ count: 0 });
    tx.timeEntry.updateMany.mockResolvedValue({ count: 0 });
    tx.taskMember.delete.mockResolvedValue({
      id: "membership-1",
      taskId: hostId,
      userId: memberId,
    });

    const result = await removeTaskMember({
      taskId: hostId,
      memberUserId: memberId,
      ownerUserId: ownerId,
    });

    expect(result.success).toBe(true);
    const updateCall = tx.task.updateMany.mock.calls[0][0];
    expect(updateCall.where.id.in).not.toContain(hostId);
    expect(updateCall.where.id.in).not.toContain("owner-child");
    expect(updateCall.where.id.in).toContain("member-child");
  });

  it("returns NOT_FOUND when caller is not the project owner", async () => {
    db.task.findUnique.mockResolvedValue(
      buildTask({
        id: hostId,
        projectId,
        createdById: ownerId,
        project: { userId: ownerId },
      }),
    );

    const result = await removeTaskMember({
      taskId: hostId,
      memberUserId: memberId,
      ownerUserId: strangerId,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });
});
