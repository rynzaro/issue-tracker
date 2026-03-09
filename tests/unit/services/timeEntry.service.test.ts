import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockPrismaClient,
  type MockPrismaClient,
} from "@/tests/helpers/prisma-mock";
import { buildTask, buildTimeEntry } from "@/tests/helpers/factories";

vi.mock("@/lib/prisma", () => {
  const mock = createMockPrismaClient();
  return { default: mock };
});

import {
  getTimeEntriesForTask,
  createManualTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
} from "@/lib/services/timeEntry.service";
import prisma from "@/lib/prisma";

const db = prisma as unknown as MockPrismaClient;

// ─── getTimeEntriesForTask ─────────────────────────────────────────────────────

describe("getTimeEntriesForTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns NOT_FOUND when task does not exist", async () => {
    db.task.findUnique.mockResolvedValue(null);

    const result = await getTimeEntriesForTask({
      userId: "test-user-1",
      taskId: "nonexistent",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });

  it("returns NOT_FOUND when task is soft-deleted", async () => {
    db.task.findUnique.mockResolvedValue(null); // deletedAt filter causes null

    const result = await getTimeEntriesForTask({
      userId: "test-user-1",
      taskId: "test-task-1",
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

    const result = await getTimeEntriesForTask({
      userId: "test-user-1",
      taskId: "test-task-1",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("AUTHORIZATION_ERROR");
    }
  });

  it("returns empty array when task has no entries", async () => {
    db.task.findUnique.mockResolvedValue(
      buildTask({ createdById: "test-user-1" }),
    );
    db.timeEntry.findMany.mockResolvedValue([]);

    const result = await getTimeEntriesForTask({
      userId: "test-user-1",
      taskId: "test-task-1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });

  it("returns entries sorted by startedAt descending", async () => {
    db.task.findUnique.mockResolvedValue(
      buildTask({ createdById: "test-user-1" }),
    );
    const entries = [
      buildTimeEntry({
        id: "entry-2",
        startedAt: new Date("2026-01-02T10:00:00Z"),
      }),
      buildTimeEntry({
        id: "entry-1",
        startedAt: new Date("2026-01-01T10:00:00Z"),
      }),
    ];
    db.timeEntry.findMany.mockResolvedValue(entries);

    const result = await getTimeEntriesForTask({
      userId: "test-user-1",
      taskId: "test-task-1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
    expect(db.timeEntry.findMany).toHaveBeenCalledWith({
      where: { taskId: "test-task-1" },
      orderBy: { startedAt: "desc" },
    });
  });

  it("queries task with deletedAt: null filter", async () => {
    db.task.findUnique.mockResolvedValue(null);

    await getTimeEntriesForTask({
      userId: "test-user-1",
      taskId: "test-task-1",
    });

    expect(db.task.findUnique).toHaveBeenCalledWith({
      where: { id: "test-task-1", deletedAt: null },
      select: { createdById: true },
    });
  });
});

// ─── createManualTimeEntry ─────────────────────────────────────────────────────

describe("createManualTimeEntry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns NOT_FOUND when task does not exist", async () => {
    db.task.findUnique.mockResolvedValue(null);

    const result = await createManualTimeEntry({
      userId: "test-user-1",
      taskId: "nonexistent",
      startedAt: new Date("2026-01-01T10:00:00Z"),
      stoppedAt: new Date("2026-01-01T11:00:00Z"),
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

    const result = await createManualTimeEntry({
      userId: "test-user-1",
      taskId: "test-task-1",
      startedAt: new Date("2026-01-01T10:00:00Z"),
      stoppedAt: new Date("2026-01-01T11:00:00Z"),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("AUTHORIZATION_ERROR");
    }
  });

  it("creates entry with auto-computed duration in seconds", async () => {
    db.task.findUnique.mockResolvedValue(
      buildTask({ createdById: "test-user-1" }),
    );
    const created = buildTimeEntry({ duration: 3600 });
    db.timeEntry.create.mockResolvedValue(created);

    const result = await createManualTimeEntry({
      userId: "test-user-1",
      taskId: "test-task-1",
      startedAt: new Date("2026-01-01T10:00:00Z"),
      stoppedAt: new Date("2026-01-01T11:00:00Z"),
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(created);
    }
    expect(db.timeEntry.create).toHaveBeenCalledWith({
      data: {
        task: { connect: { id: "test-task-1" } },
        user: { connect: { id: "test-user-1" } },
        startedAt: new Date("2026-01-01T10:00:00Z"),
        stoppedAt: new Date("2026-01-01T11:00:00Z"),
        duration: 3600,
      },
    });
  });

  it("queries task with deletedAt: null filter", async () => {
    db.task.findUnique.mockResolvedValue(null);

    await createManualTimeEntry({
      userId: "test-user-1",
      taskId: "test-task-1",
      startedAt: new Date("2026-01-01T10:00:00Z"),
      stoppedAt: new Date("2026-01-01T11:00:00Z"),
    });

    expect(db.task.findUnique).toHaveBeenCalledWith({
      where: { id: "test-task-1", deletedAt: null },
      select: { createdById: true },
    });
  });
});

// ─── updateTimeEntry ───────────────────────────────────────────────────────────

describe("updateTimeEntry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns NOT_FOUND when entry does not exist", async () => {
    db.timeEntry.findUnique.mockResolvedValue(null);

    const result = await updateTimeEntry({
      userId: "test-user-1",
      timeEntryId: "nonexistent",
      startedAt: new Date("2026-01-01T10:00:00Z"),
      stoppedAt: new Date("2026-01-01T11:00:00Z"),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });

  it("returns AUTHORIZATION_ERROR when user does not own entry", async () => {
    db.timeEntry.findUnique.mockResolvedValue(
      buildTimeEntry({ userId: "other-user" }),
    );

    const result = await updateTimeEntry({
      userId: "test-user-1",
      timeEntryId: "test-time-entry-1",
      startedAt: new Date("2026-01-01T10:00:00Z"),
      stoppedAt: new Date("2026-01-01T11:00:00Z"),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("AUTHORIZATION_ERROR");
    }
  });

  it("updates entry with recomputed duration", async () => {
    db.timeEntry.findUnique.mockResolvedValue(
      buildTimeEntry({ userId: "test-user-1" }),
    );
    db.task.findUnique.mockResolvedValue(buildTask());
    const updated = buildTimeEntry({
      startedAt: new Date("2026-01-01T14:00:00Z"),
      stoppedAt: new Date("2026-01-01T14:30:00Z"),
      duration: 1800,
    });
    db.timeEntry.update.mockResolvedValue(updated);

    const result = await updateTimeEntry({
      userId: "test-user-1",
      timeEntryId: "test-time-entry-1",
      startedAt: new Date("2026-01-01T14:00:00Z"),
      stoppedAt: new Date("2026-01-01T14:30:00Z"),
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(updated);
    }
    expect(db.timeEntry.update).toHaveBeenCalledWith({
      where: { id: "test-time-entry-1" },
      data: {
        startedAt: new Date("2026-01-01T14:00:00Z"),
        stoppedAt: new Date("2026-01-01T14:30:00Z"),
        duration: 1800,
      },
    });
  });
  it("returns NOT_FOUND when parent task is soft-deleted", async () => {
    db.timeEntry.findUnique.mockResolvedValue(
      buildTimeEntry({ userId: "test-user-1" }),
    );
    db.task.findUnique.mockResolvedValue(null); // deletedAt filter causes null

    const result = await updateTimeEntry({
      userId: "test-user-1",
      timeEntryId: "test-time-entry-1",
      startedAt: new Date("2026-01-01T10:00:00Z"),
      stoppedAt: new Date("2026-01-01T11:00:00Z"),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });
});

// ─── deleteTimeEntry ───────────────────────────────────────────────────────────

describe("deleteTimeEntry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns NOT_FOUND when entry does not exist", async () => {
    db.timeEntry.findUnique.mockResolvedValue(null);

    const result = await deleteTimeEntry({
      userId: "test-user-1",
      timeEntryId: "nonexistent",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });

  it("returns AUTHORIZATION_ERROR when user does not own entry", async () => {
    db.timeEntry.findUnique.mockResolvedValue(
      buildTimeEntry({ userId: "other-user" }),
    );

    const result = await deleteTimeEntry({
      userId: "test-user-1",
      timeEntryId: "test-time-entry-1",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("AUTHORIZATION_ERROR");
    }
  });

  it("deletes the entry and returns success", async () => {
    db.timeEntry.findUnique.mockResolvedValue(
      buildTimeEntry({ userId: "test-user-1" }),
    );
    db.task.findUnique.mockResolvedValue(buildTask());
    db.timeEntry.delete.mockResolvedValue(
      buildTimeEntry({ userId: "test-user-1" }),
    );

    const result = await deleteTimeEntry({
      userId: "test-user-1",
      timeEntryId: "test-time-entry-1",
    });

    expect(result.success).toBe(true);
    expect(db.timeEntry.delete).toHaveBeenCalledWith({
      where: { id: "test-time-entry-1" },
    });
  });

  it("returns NOT_FOUND when parent task is soft-deleted", async () => {
    db.timeEntry.findUnique.mockResolvedValue(
      buildTimeEntry({ userId: "test-user-1" }),
    );
    db.task.findUnique.mockResolvedValue(null); // deletedAt filter causes null

    const result = await deleteTimeEntry({
      userId: "test-user-1",
      timeEntryId: "test-time-entry-1",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });
});
