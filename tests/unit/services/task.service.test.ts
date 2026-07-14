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

import {
  hasActiveDescendants,
  createTask,
  updateTask,
} from "@/lib/services/task.service";
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

describe("createTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.$transaction.mockImplementation((fn: (client: MockTx) => unknown) =>
      fn(tx),
    );
    db.project.findUnique.mockResolvedValue({ userId: "test-user-1" });
    tx.taskEvent.create.mockResolvedValue({ id: "event-1" });
  });

  it("emits one CREATED event carrying title, estimate, and parentId, in the transaction", async () => {
    // Parent-existence check inside createTask
    db.task.findUnique.mockResolvedValue({ id: "parent-1" });
    tx.task.create.mockResolvedValue(
      buildTask({ id: "task-1", parentId: "parent-1", estimate: 60 }),
    );

    const result = await createTask({
      userId: "test-user-1",
      createTaskParams: {
        projectId: "project-1",
        parentId: "parent-1",
        title: "Write the docs",
        estimate: 60,
      },
    });

    expect(result.success).toBe(true);
    expect(tx.taskEvent.create).toHaveBeenCalledTimes(1);
    expect(tx.taskEvent.create).toHaveBeenCalledWith({
      data: {
        taskId: "task-1",
        userId: "test-user-1",
        eventType: TaskEventType.CREATED,
        payload: {
          title: "Write the docs",
          estimate: 60,
          parentId: "parent-1",
        },
      },
    });
  });

  it("emits CREATED with only a title when the task has no estimate and no parent", async () => {
    tx.task.create.mockResolvedValue(
      buildTask({ id: "task-2", parentId: null, estimate: null }),
    );

    const result = await createTask({
      userId: "test-user-1",
      createTaskParams: {
        projectId: "project-1",
        parentId: null,
        title: "Solo task",
      },
    });

    expect(result.success).toBe(true);
    expect(tx.taskEvent.create).toHaveBeenCalledWith({
      data: {
        taskId: "task-2",
        userId: "test-user-1",
        eventType: TaskEventType.CREATED,
        payload: { title: "Solo task" },
      },
    });
  });

  it("does not emit ESTIMATE_CHANGED at creation, even when born with an estimate", async () => {
    tx.task.create.mockResolvedValue(
      buildTask({ id: "task-3", parentId: null, estimate: 90 }),
    );

    await createTask({
      userId: "test-user-1",
      createTaskParams: {
        projectId: "project-1",
        parentId: null,
        title: "Estimated at birth",
        estimate: 90,
      },
    });

    // Exactly one event, and it is CREATED — so no ESTIMATE_CHANGED rode along.
    expect(tx.taskEvent.create).toHaveBeenCalledTimes(1);
    expect(tx.taskEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: TaskEventType.CREATED }),
      }),
    );
  });
});

describe("updateTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.$transaction.mockImplementation((fn: (client: MockTx) => unknown) =>
      fn(tx),
    );
    tx.taskEvent.create.mockResolvedValue({ id: "event-1" });
  });

  it("emits ESTIMATE_CHANGED with old and new when the estimate changes", async () => {
    db.task.findUnique.mockResolvedValue({
      estimate: 60,
      project: { userId: "test-user-1" },
    });
    tx.task.update.mockResolvedValue(buildTask({ id: "task-1", estimate: 120 }));

    const result = await updateTask({
      userId: "test-user-1",
      updateTaskParams: {
        id: "task-1",
        title: "Updated title",
        estimate: 120,
        tagIds: null,
      },
    });

    expect(result.success).toBe(true);
    expect(tx.taskEvent.create).toHaveBeenCalledTimes(1);
    expect(tx.taskEvent.create).toHaveBeenCalledWith({
      data: {
        taskId: "task-1",
        userId: "test-user-1",
        eventType: TaskEventType.ESTIMATE_CHANGED,
        payload: { old: 60, new: 120 },
      },
    });
  });

  it("emits ESTIMATE_CHANGED with old null when setting an estimate on a task that had none", async () => {
    db.task.findUnique.mockResolvedValue({
      estimate: null,
      project: { userId: "test-user-1" },
    });
    tx.task.update.mockResolvedValue(buildTask({ id: "task-1", estimate: 45 }));

    await updateTask({
      userId: "test-user-1",
      updateTaskParams: {
        id: "task-1",
        title: "Now estimated",
        estimate: 45,
        tagIds: null,
      },
    });

    expect(tx.taskEvent.create).toHaveBeenCalledWith({
      data: {
        taskId: "task-1",
        userId: "test-user-1",
        eventType: TaskEventType.ESTIMATE_CHANGED,
        payload: { old: null, new: 45 },
      },
    });
  });

  it("does not emit ESTIMATE_CHANGED when the estimate is not part of the update", async () => {
    db.task.findUnique.mockResolvedValue({
      estimate: 60,
      project: { userId: "test-user-1" },
    });
    tx.task.update.mockResolvedValue(buildTask({ id: "task-1", estimate: 60 }));

    await updateTask({
      userId: "test-user-1",
      updateTaskParams: {
        id: "task-1",
        title: "Only the title changed",
        tagIds: null,
      },
    });

    expect(tx.taskEvent.create).not.toHaveBeenCalled();
  });

  it("does not emit ESTIMATE_CHANGED when the estimate is unchanged", async () => {
    db.task.findUnique.mockResolvedValue({
      estimate: 60,
      project: { userId: "test-user-1" },
    });
    tx.task.update.mockResolvedValue(buildTask({ id: "task-1", estimate: 60 }));

    await updateTask({
      userId: "test-user-1",
      updateTaskParams: {
        id: "task-1",
        title: "Re-saved with same estimate",
        estimate: 60,
        tagIds: null,
      },
    });

    expect(tx.taskEvent.create).not.toHaveBeenCalled();
  });
});
