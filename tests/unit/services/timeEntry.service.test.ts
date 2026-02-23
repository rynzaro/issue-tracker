import { describe, it, expect, vi, beforeEach } from "vitest";
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

// Must import AFTER mock setup
import {
  startTimeEntry,
  stopTimeEntry,
} from "@/lib/services/timeEntry.service";
import prisma from "@/lib/prisma";

const db = prisma as unknown as MockPrismaClient;
const tx = mockTx as MockTx;

describe("startTimeEntry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the $transaction mock to pass mockTx
    db.$transaction.mockImplementation((fn: any) => fn(tx));
  });

  it("returns NOT_FOUND when task does not exist", async () => {
    db.task.findUnique.mockResolvedValue(null);

    const result = await startTimeEntry({
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

    const result = await startTimeEntry({
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

    const result = await startTimeEntry({
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

    const result = await startTimeEntry({
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

    await startTimeEntry({ userId: "test-user-1", taskId: "test-task-1" });

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

    await startTimeEntry({ userId: "test-user-1", taskId: "test-task-2" });

    // Verify order: create TimeEntry → delete old timer → create new timer
    const createEntryOrder = tx.timeEntry.create.mock.invocationCallOrder[0];
    const deleteTimerOrder = tx.activeTimer.delete.mock.invocationCallOrder[0];
    const createTimerOrder = tx.activeTimer.create.mock.invocationCallOrder[0];
    expect(createEntryOrder).toBeLessThan(deleteTimerOrder);
    expect(deleteTimerOrder).toBeLessThan(createTimerOrder);
  });
});

describe("stopTimeEntry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.$transaction.mockImplementation((fn: any) => fn(tx));
  });

  it("returns NOT_FOUND when user has no active timer", async () => {
    db.activeTimer.findUnique.mockResolvedValue(null);

    const result = await stopTimeEntry({ userId: "test-user-1" });

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

    const result = await stopTimeEntry({ userId: "test-user-1" });

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

    await stopTimeEntry({ userId: "test-user-1" });

    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  it("computes duration as seconds between startedAt and now", async () => {
    const startedAt = new Date("2026-01-01T10:00:00Z");
    const existingTimer = buildActiveTimer({ startedAt });

    db.activeTimer.findUnique.mockResolvedValue(existingTimer);
    tx.timeEntry.create.mockResolvedValue(buildTimeEntry());
    tx.activeTimer.delete.mockResolvedValue(existingTimer);

    await stopTimeEntry({ userId: "test-user-1" });

    const createCall = tx.timeEntry.create.mock.calls[0][0];
    expect(createCall.data.duration).toBeGreaterThan(0);
    expect(typeof createCall.data.duration).toBe("number");
    // Duration should be an integer (floor of seconds)
    expect(Number.isInteger(createCall.data.duration)).toBe(true);
  });
});
