import { describe, it, expect, vi, beforeEach } from "vitest";
import { TaskEventType } from "@prisma/client";
import {
  createMockPrismaClient,
  mockTx,
  type MockPrismaClient,
  type MockTx,
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
const tx = mockTx as MockTx;

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

  it("returns empty list when user is neither owner nor entry author", async () => {
    db.task.findUnique.mockResolvedValue(
      buildTask({
        createdById: "other-user",
        project: { userId: "other-user" },
        members: [],
      }),
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

  it("returns empty array when task has no entries", async () => {
    db.task.findUnique.mockResolvedValue(
      buildTask({
        createdById: "test-user-1",
        project: { userId: "test-user-1" },
        members: [],
      }),
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
      buildTask({
        createdById: "test-user-1",
        project: { userId: "test-user-1" },
        members: [],
      }),
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
      where: { taskId: "test-task-1", deletedAt: null },
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
      select: {
        createdById: true,
        project: { select: { userId: true } },
        members: { select: { userId: true } },
      },
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
      buildTask({
        createdById: "other-user",
        project: { userId: "other-user" },
        members: [],
      }),
    );

    const result = await createManualTimeEntry({
      userId: "test-user-1",
      taskId: "test-task-1",
      startedAt: new Date("2026-01-01T10:00:00Z"),
      stoppedAt: new Date("2026-01-01T11:00:00Z"),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });

  it("creates entry with auto-computed duration in seconds", async () => {
    db.task.findUnique.mockResolvedValue(
      buildTask({
        createdById: "test-user-1",
        project: { userId: "test-user-1" },
        members: [],
      }),
    );
    // Runs inside a $transaction since #55, so the create rides the tx client.
    db.$transaction.mockImplementation((fn) => fn(tx));
    const created = buildTimeEntry({ duration: 3600 });
    tx.timeEntry.create.mockResolvedValue(created);

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
    expect(tx.timeEntry.create).toHaveBeenCalledWith({
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
      select: {
        createdById: true,
        project: { select: { userId: true } },
        members: { select: { userId: true } },
      },
    });
  });
});

// ─── createManualTimeEntry — STARTED event ───────────────────────────────────────

describe("createManualTimeEntry — STARTED event", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.$transaction.mockImplementation((fn) => fn(tx));
    db.task.findUnique.mockResolvedValue(
      buildTask({
        createdById: "test-user-1",
        project: { userId: "test-user-1" },
        members: [],
      }),
    );
    tx.timeEntry.create.mockResolvedValue(buildTimeEntry());
  });

  it("emits STARTED with the entry's start time when the task has no prior STARTED", async () => {
    tx.taskEvent.findFirst.mockResolvedValue(null);

    await createManualTimeEntry({
      userId: "test-user-1",
      taskId: "test-task-1",
      startedAt: new Date("2026-01-01T10:00:00Z"),
      stoppedAt: new Date("2026-01-01T11:00:00Z"),
    });

    expect(tx.taskEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          taskId: "test-task-1",
          userId: "test-user-1",
          eventType: TaskEventType.STARTED,
          payload: { startedAt: "2026-01-01T10:00:00.000Z" },
        }),
      }),
    );
  });

  it("does not re-emit STARTED for a backdated entry when one already exists", async () => {
    // Task already started (via timer or an earlier entry); a later, backdated
    // manual entry must not move or duplicate STARTED (#23: corrections live in state).
    tx.taskEvent.findFirst.mockResolvedValue({ id: "existing-started" });

    await createManualTimeEntry({
      userId: "test-user-1",
      taskId: "test-task-1",
      startedAt: new Date("2025-12-01T08:00:00Z"), // backdated before the existing STARTED
      stoppedAt: new Date("2025-12-01T09:00:00Z"),
    });

    expect(tx.taskEvent.create).not.toHaveBeenCalled();
  });

  it("scopes the prior-STARTED guard to this task and event type", async () => {
    tx.taskEvent.findFirst.mockResolvedValue(null);

    await createManualTimeEntry({
      userId: "test-user-1",
      taskId: "test-task-1",
      startedAt: new Date("2026-01-01T10:00:00Z"),
      stoppedAt: new Date("2026-01-01T11:00:00Z"),
    });

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

    const result = await createManualTimeEntry({
      userId: "test-user-1",
      taskId: "test-task-1",
      startedAt: new Date("2026-01-01T10:00:00Z"),
      stoppedAt: new Date("2026-01-01T11:00:00Z"),
    });

    expect(result.success).toBe(false);
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
    db.task.findUnique.mockResolvedValue(
      buildTask({
        createdById: "other-user",
        project: { userId: "other-user" },
        members: [],
      }),
    );

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

  it("updates entry with recomputed duration", async () => {
    db.timeEntry.findUnique.mockResolvedValue(
      buildTimeEntry({ userId: "test-user-1" }),
    );
    db.task.findUnique.mockResolvedValue(
      buildTask({
        createdById: "test-user-1",
        project: { userId: "test-user-1" },
        members: [],
      }),
    );
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
    db.task.findUnique.mockResolvedValue(
      buildTask({
        createdById: "other-user",
        project: { userId: "other-user" },
        members: [],
      }),
    );

    const result = await deleteTimeEntry({
      userId: "test-user-1",
      timeEntryId: "test-time-entry-1",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });

  it("deletes the entry and returns success", async () => {
    db.timeEntry.findUnique.mockResolvedValue(
      buildTimeEntry({ userId: "test-user-1" }),
    );
    db.task.findUnique.mockResolvedValue(
      buildTask({
        createdById: "test-user-1",
        project: { userId: "test-user-1" },
        members: [],
      }),
    );
    db.timeEntry.update.mockResolvedValue(
      buildTimeEntry({ userId: "test-user-1" }),
    );

    const result = await deleteTimeEntry({
      userId: "test-user-1",
      timeEntryId: "test-time-entry-1",
    });

    expect(result.success).toBe(true);
    expect(db.timeEntry.update).toHaveBeenCalledWith({
      where: { id: "test-time-entry-1" },
      data: { deletedAt: expect.any(Date) },
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
