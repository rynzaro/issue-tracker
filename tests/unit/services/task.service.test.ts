import { describe, it, expect, vi, beforeEach } from "vitest";
import { TaskEventType } from "@prisma/client";
import {
  createMockPrismaClient,
  mockTx,
  type MockPrismaClient,
  type MockTx,
} from "@/tests/helpers/prisma-mock";
import { buildTask, buildActiveTimer } from "@/tests/helpers/factories";

vi.mock("@/lib/prisma", () => {
  const mock = createMockPrismaClient();
  return { default: mock };
});

import { hasActiveDescendants, updateTask } from "@/lib/services/task.service";
import prisma from "@/lib/prisma";

const db = prisma as unknown as MockPrismaClient;
const tx = mockTx as MockTx;

describe("hasActiveTimers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns NOT_FOUND when task does not exist", async () => {
    db.task.findUnique.mockResolvedValue(null);

    const result = await hasActiveDescendants({ taskId: "nonexistent" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });

  it("returns false when no active timers exist for the task or descendants", async () => {
    db.task.findUnique.mockResolvedValue({ projectId: "test-project-1" });
    db.task.findMany.mockResolvedValue([
      { id: "task-1", parentId: null },
      { id: "task-2", parentId: "task-1" },
    ]);
    db.activeTimer.findFirst.mockResolvedValue(null);

    const result = await hasActiveDescendants({ taskId: "task-1" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(false);
    }
  });

  it("returns true when the task itself has an active timer", async () => {
    db.task.findUnique.mockResolvedValue({ projectId: "test-project-1" });
    db.task.findMany.mockResolvedValue([{ id: "task-1", parentId: null }]);
    db.activeTimer.findFirst.mockResolvedValue(
      buildActiveTimer({ taskId: "task-1" }),
    );

    const result = await hasActiveDescendants({ taskId: "task-1" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(true);
    }
  });

  it("returns true when a descendant has an active timer", async () => {
    db.task.findUnique.mockResolvedValue({ projectId: "test-project-1" });
    // Tree: task-1 -> task-2 -> task-3
    db.task.findMany.mockResolvedValue([
      { id: "task-1", parentId: null },
      { id: "task-2", parentId: "task-1" },
      { id: "task-3", parentId: "task-2" },
    ]);
    db.activeTimer.findFirst.mockResolvedValue(
      buildActiveTimer({ taskId: "task-3" }),
    );

    const result = await hasActiveDescendants({ taskId: "task-1" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(true);
    }
    // Should search all descendants
    expect(db.activeTimer.findFirst).toHaveBeenCalledWith({
      where: { taskId: { in: ["task-1", "task-2", "task-3"] } },
    });
  });

  it("only includes descendants of the queried task, not siblings", async () => {
    db.task.findUnique.mockResolvedValue({ projectId: "test-project-1" });
    // Tree: task-1 -> task-2, task-1 -> task-3, task-4 (sibling root)
    db.task.findMany.mockResolvedValue([
      { id: "task-1", parentId: null },
      { id: "task-2", parentId: "task-1" },
      { id: "task-3", parentId: "task-1" },
      { id: "task-4", parentId: null },
    ]);
    db.activeTimer.findFirst.mockResolvedValue(null);

    await hasActiveDescendants({ taskId: "task-1" });

    // Should NOT include task-4 (not a descendant of task-1)
    expect(db.activeTimer.findFirst).toHaveBeenCalledWith({
      where: { taskId: { in: ["task-1", "task-2", "task-3"] } },
    });
  });
});

describe("updateTask — TAGS_CHANGED event", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Route the mutation's transaction through the shared tx mock.
    db.$transaction.mockImplementation((fn: (client: MockTx) => unknown) =>
      fn(tx),
    );
    // Owner passes the access check (select is { project: { userId } }).
    db.task.findUnique.mockResolvedValue({
      project: { userId: "test-user-1" },
    });
    tx.task.update.mockResolvedValue(buildTask());
    tx.taskEvent.create.mockResolvedValue({ id: "event-1" });
  });

  it("emits one TAGS_CHANGED with the before/after tag-id sets when tags change", async () => {
    tx.taskTag.findMany.mockResolvedValue([{ tagId: 1 }, { tagId: 2 }]);

    const result = await updateTask({
      userId: "test-user-1",
      updateTaskParams: {
        id: "test-task-1",
        title: "Test Task",
        tagIds: [2, 3],
      },
    });

    expect(result.success).toBe(true);
    expect(tx.taskEvent.create).toHaveBeenCalledTimes(1);
    expect(tx.taskEvent.create).toHaveBeenCalledWith({
      data: {
        taskId: "test-task-1",
        userId: "test-user-1",
        eventType: TaskEventType.TAGS_CHANGED,
        payload: { old: [1, 2], new: [2, 3] },
      },
    });
  });

  it("does not emit when the same tag set is re-submitted (order-independent)", async () => {
    tx.taskTag.findMany.mockResolvedValue([{ tagId: 1 }, { tagId: 2 }]);

    const result = await updateTask({
      userId: "test-user-1",
      updateTaskParams: {
        id: "test-task-1",
        title: "Test Task",
        tagIds: [2, 1],
      },
    });

    expect(result.success).toBe(true);
    // The write still runs; only the spurious event is suppressed.
    expect(tx.task.update).toHaveBeenCalledTimes(1);
    expect(tx.taskEvent.create).not.toHaveBeenCalled();
  });

  it("does not read or emit tags when tagIds is null (tags untouched)", async () => {
    const result = await updateTask({
      userId: "test-user-1",
      updateTaskParams: { id: "test-task-1", title: "Renamed", tagIds: null },
    });

    expect(result.success).toBe(true);
    expect(tx.task.update).toHaveBeenCalledTimes(1);
    expect(tx.taskTag.findMany).not.toHaveBeenCalled();
    expect(tx.taskEvent.create).not.toHaveBeenCalled();
  });

  it("captures old as an empty set when first tagging an untagged task", async () => {
    tx.taskTag.findMany.mockResolvedValue([]);

    await updateTask({
      userId: "test-user-1",
      updateTaskParams: { id: "test-task-1", title: "Test Task", tagIds: [5] },
    });

    expect(tx.taskEvent.create).toHaveBeenCalledWith({
      data: {
        taskId: "test-task-1",
        userId: "test-user-1",
        eventType: TaskEventType.TAGS_CHANGED,
        payload: { old: [], new: [5] },
      },
    });
  });
});
