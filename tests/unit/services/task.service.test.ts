import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockPrismaClient,
  type MockPrismaClient,
} from "@/tests/helpers/prisma-mock";
import { buildTask, buildActiveTimer } from "@/tests/helpers/factories";

vi.mock("@/lib/prisma", () => {
  const mock = createMockPrismaClient();
  return { default: mock };
});

import { hasActiveTimers } from "@/lib/services/task.service";
import prisma from "@/lib/prisma";

const db = prisma as unknown as MockPrismaClient;

describe("hasActiveTimers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns NOT_FOUND when task does not exist", async () => {
    db.task.findUnique.mockResolvedValue(null);

    const result = await hasActiveTimers({ taskId: "nonexistent" });

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

    const result = await hasActiveTimers({ taskId: "task-1" });

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

    const result = await hasActiveTimers({ taskId: "task-1" });

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

    const result = await hasActiveTimers({ taskId: "task-1" });

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

    await hasActiveTimers({ taskId: "task-1" });

    // Should NOT include task-4 (not a descendant of task-1)
    expect(db.activeTimer.findFirst).toHaveBeenCalledWith({
      where: { taskId: { in: ["task-1", "task-2", "task-3"] } },
    });
  });
});
