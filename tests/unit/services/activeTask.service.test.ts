import { describe, it, expect, vi, beforeEach } from "vitest";
import { TaskEventType } from "@prisma/client";
import {
  createMockPrismaClient,
  mockTx,
  type MockPrismaClient,
  type MockTx,
} from "@/tests/helpers/prisma-mock";
import {
  buildTask,
  buildActiveTimer,
  buildTimeEntry,
} from "@/tests/helpers/factories";

vi.mock("@/lib/prisma", () => {
  const mock = createMockPrismaClient();
  return { default: mock };
});

import {
  getActiveTimer,
  startActiveTimer,
  stopActiveTimer,
} from "@/lib/services/activeTask.service";
import prisma from "@/lib/prisma";

const db = prisma as unknown as MockPrismaClient;
const tx = mockTx as MockTx;

describe("getActiveTimer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the active timer when one exists", async () => {
    const timer = buildActiveTimer();
    db.activeTimer.findUnique.mockResolvedValue(timer);

    const result = await getActiveTimer({ userId: "test-user-1" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(timer);
    }
  });

  it("returns null data when no active timer exists", async () => {
    db.activeTimer.findUnique.mockResolvedValue(null);

    const result = await getActiveTimer({ userId: "test-user-1" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it("queries by userId", async () => {
    db.activeTimer.findUnique.mockResolvedValue(null);

    await getActiveTimer({ userId: "specific-user" });

    expect(db.activeTimer.findUnique).toHaveBeenCalledWith({
      where: { userId: "specific-user" },
      include: { task: { select: { title: true } } },
    });
  });
});

describe("startActiveTimer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the $transaction mock to pass mockTx
    db.$transaction.mockImplementation((fn: any) => fn(tx));
  });

  it("returns NOT_FOUND when task does not exist", async () => {
    db.task.findUnique.mockResolvedValue(null);

    const result = await startActiveTimer({
      userId: "test-user-1",
      taskId: "nonexistent",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });

  it("returns AUTHORIZATION_ERROR when user does not own the task", async () => {
    db.task.findUnique.mockResolvedValue(
      buildTask({ createdById: "other-user" }),
    );

    const result = await startActiveTimer({
      userId: "test-user-1",
      taskId: "test-task-1",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("AUTHORIZATION_ERROR");
    }
  });

  it("creates ActiveTimer when no existing timer exists", async () => {
    db.task.findUnique.mockResolvedValue(
      buildTask({ createdById: "test-user-1" }),
    );
    tx.activeTimer.findUnique.mockResolvedValue(null);
    const newTimer = buildActiveTimer();
    tx.activeTimer.create.mockResolvedValue(newTimer);

    const result = await startActiveTimer({
      userId: "test-user-1",
      taskId: "test-task-1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.activeTimer).toEqual(newTimer);
      expect(result.data.timeEntry).toBeNull();
    }
    expect(tx.activeTimer.delete).not.toHaveBeenCalled();
    expect(tx.timeEntry.create).not.toHaveBeenCalled();
  });

  it("converts existing timer to TimeEntry and creates new ActiveTimer when switching tasks", async () => {
    const existingTimer = buildActiveTimer({
      taskId: "old-task",
      startedAt: new Date("2026-01-01T10:00:00Z"),
    });
    const createdTimeEntry = buildTimeEntry({
      taskId: "old-task",
      startedAt: new Date("2026-01-01T10:00:00Z"),
    });
    const newTimer = buildActiveTimer({ taskId: "test-task-2" });

    db.task.findUnique.mockResolvedValue(
      buildTask({ id: "test-task-2", createdById: "test-user-1" }),
    );
    tx.activeTimer.findUnique.mockResolvedValue(existingTimer);
    tx.timeEntry.create.mockResolvedValue(createdTimeEntry);
    tx.activeTimer.delete.mockResolvedValue(existingTimer);
    tx.activeTimer.create.mockResolvedValue(newTimer);

    const result = await startActiveTimer({
      userId: "test-user-1",
      taskId: "test-task-2",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.activeTimer).toEqual(newTimer);
      expect(result.data.timeEntry).toEqual(createdTimeEntry);
    }
    // Old timer was deleted
    expect(tx.activeTimer.delete).toHaveBeenCalledWith({
      where: { userId: "test-user-1" },
    });
    // TimeEntry created from old timer
    expect(tx.timeEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          task: { connect: { id: "old-task" } },
          user: { connect: { id: "test-user-1" } },
          startedAt: existingTimer.startedAt,
        }),
      }),
    );
  });

  it("runs start logic inside a transaction", async () => {
    db.task.findUnique.mockResolvedValue(
      buildTask({ createdById: "test-user-1" }),
    );
    tx.activeTimer.findUnique.mockResolvedValue(null);
    tx.activeTimer.create.mockResolvedValue(buildActiveTimer());

    await startActiveTimer({ userId: "test-user-1", taskId: "test-task-1" });

    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  it("creates TimeEntry before deleting old timer when switching tasks", async () => {
    const existingTimer = buildActiveTimer({
      taskId: "old-task",
      startedAt: new Date("2026-01-01T10:00:00Z"),
    });

    db.task.findUnique.mockResolvedValue(
      buildTask({ id: "test-task-2", createdById: "test-user-1" }),
    );
    tx.activeTimer.findUnique.mockResolvedValue(existingTimer);
    tx.timeEntry.create.mockResolvedValue(
      buildTimeEntry({ taskId: "old-task" }),
    );
    tx.activeTimer.delete.mockResolvedValue(existingTimer);
    tx.activeTimer.create.mockResolvedValue(
      buildActiveTimer({ taskId: "test-task-2" }),
    );

    await startActiveTimer({ userId: "test-user-1", taskId: "test-task-2" });

    // Verify order: create TimeEntry → delete old timer → create new timer
    const createEntryOrder = tx.timeEntry.create.mock.invocationCallOrder[0];
    const deleteTimerOrder = tx.activeTimer.delete.mock.invocationCallOrder[0];
    const createTimerOrder = tx.activeTimer.create.mock.invocationCallOrder[0];
    expect(createEntryOrder).toBeLessThan(deleteTimerOrder);
    expect(deleteTimerOrder).toBeLessThan(createTimerOrder);
  });
});

describe("startActiveTimer — STARTED event", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.$transaction.mockImplementation((fn) => fn(tx));
    db.task.findUnique.mockResolvedValue(
      buildTask({ createdById: "test-user-1" }),
    );
    tx.activeTimer.findUnique.mockResolvedValue(null);
    tx.activeTimer.create.mockResolvedValue(buildActiveTimer());
  });

  it("emits STARTED with the start time on the task's first work", async () => {
    tx.taskEvent.findFirst.mockResolvedValue(null); // no prior STARTED

    await startActiveTimer({ userId: "test-user-1", taskId: "test-task-1" });

    expect(tx.taskEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          taskId: "test-task-1",
          userId: "test-user-1",
          eventType: TaskEventType.STARTED,
          // stored as an ISO-8601 string by emitEvent's timestamp transform
          payload: { startedAt: expect.any(String) },
        }),
      }),
    );
  });

  it("does not emit a second STARTED when the task already has one", async () => {
    tx.taskEvent.findFirst.mockResolvedValue({ id: "existing-started" });

    await startActiveTimer({ userId: "test-user-1", taskId: "test-task-1" });

    expect(tx.taskEvent.create).not.toHaveBeenCalled();
  });

  it("scopes the prior-STARTED guard to this task and event type", async () => {
    tx.taskEvent.findFirst.mockResolvedValue(null);

    await startActiveTimer({ userId: "test-user-1", taskId: "test-task-1" });

    expect(tx.taskEvent.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          taskId: "test-task-1",
          eventType: TaskEventType.STARTED,
        }),
      }),
    );
  });

  it("fails the action (rolls back) when the STARTED emit throws", async () => {
    tx.taskEvent.findFirst.mockResolvedValue(null);
    tx.taskEvent.create.mockRejectedValue(new Error("emit failed"));

    const result = await startActiveTimer({
      userId: "test-user-1",
      taskId: "test-task-1",
    });

    expect(result.success).toBe(false);
  });
});

describe("stopActiveTimer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.$transaction.mockImplementation((fn: any) => fn(tx));
  });

  it("returns NOT_FOUND when user has no active timer", async () => {
    db.activeTimer.findUnique.mockResolvedValue(null);

    const result = await stopActiveTimer({ userId: "test-user-1" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });

  it("deletes ActiveTimer and creates TimeEntry with correct duration", async () => {
    const existingTimer = buildActiveTimer({
      startedAt: new Date("2026-01-01T10:00:00Z"),
    });
    const createdEntry = buildTimeEntry({ duration: 3600 });

    db.activeTimer.findUnique.mockResolvedValue(existingTimer);
    tx.timeEntry.create.mockResolvedValue(createdEntry);
    tx.activeTimer.delete.mockResolvedValue(existingTimer);

    const result = await stopActiveTimer({ userId: "test-user-1" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(createdEntry);
    }
    expect(tx.activeTimer.delete).toHaveBeenCalledWith({
      where: { userId: "test-user-1" },
    });
    expect(tx.timeEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          task: { connect: { id: "test-task-1" } },
          user: { connect: { id: "test-user-1" } },
          startedAt: existingTimer.startedAt,
        }),
      }),
    );
  });

  it("runs stop logic inside a transaction", async () => {
    db.activeTimer.findUnique.mockResolvedValue(buildActiveTimer());
    tx.timeEntry.create.mockResolvedValue(buildTimeEntry());
    tx.activeTimer.delete.mockResolvedValue(buildActiveTimer());

    await stopActiveTimer({ userId: "test-user-1" });

    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  it("computes duration as seconds between startedAt and now", async () => {
    const startedAt = new Date("2026-01-01T10:00:00Z");
    const existingTimer = buildActiveTimer({ startedAt });

    db.activeTimer.findUnique.mockResolvedValue(existingTimer);
    tx.timeEntry.create.mockResolvedValue(buildTimeEntry());
    tx.activeTimer.delete.mockResolvedValue(existingTimer);

    await stopActiveTimer({ userId: "test-user-1" });

    const createCall = tx.timeEntry.create.mock.calls[0][0];
    expect(createCall.data.duration).toBeGreaterThan(0);
    expect(typeof createCall.data.duration).toBe("number");
    // Duration should be an integer (floor of seconds)
    expect(Number.isInteger(createCall.data.duration)).toBe(true);
  });
});
