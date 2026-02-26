import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockPrismaClient,
  type MockPrismaClient,
} from "@/tests/helpers/prisma-mock";
import { buildProject, buildTask } from "@/tests/helpers/factories";

// ─── Mock Prisma ───────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => {
  const mock = createMockPrismaClient();
  return { default: mock };
});

// ─── Mock activeTask.service (external dependency of getProjectTaskTree) ──────

vi.mock("@/lib/services/activeTask.service", () => ({
  getActiveTimeEntryForUser: vi.fn(),
}));

import { getProjectTaskTree } from "@/lib/services/project.service";
import { getActiveTimeEntryForUser } from "@/lib/services/activeTask.service";
import prisma from "@/lib/prisma";

const db = prisma as unknown as MockPrismaClient;
const mockGetActiveTimer = getActiveTimeEntryForUser as ReturnType<
  typeof vi.fn
>;

// ─── Helper: build a task row as returned by Prisma's include query ──────────

function makeDbTask(overrides: Record<string, unknown> = {}) {
  return {
    ...buildTask(),
    todoItems: [],
    taskTags: [],
    timeEntries: [],
    ...overrides,
  };
}

// ─── Helper: set up Prisma mock for getUserProjectWithTasks (called internally)

function mockProjectWithTasks(
  tasks: ReturnType<typeof makeDbTask>[],
  projectOverrides: Record<string, unknown> = {},
) {
  db.project.findUnique.mockResolvedValue({
    ...buildProject(),
    userId: "test-user-1",
    tasks,
    ...projectOverrides,
  });
}

describe("getProjectTaskTree", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetActiveTimer.mockResolvedValue({ success: true, data: null });
  });

  // ─── Time rollup ───────────────────────────────────────────────────────────

  it("computes totalTimeSpent from timeEntries durations", async () => {
    mockProjectWithTasks([
      makeDbTask({
        id: "task-1",
        parentId: null,
        timeEntries: [{ duration: 100 }, { duration: 200 }, { duration: 50 }],
      }),
    ]);

    const result = await getProjectTaskTree({
      userId: "test-user-1",
      projectId: "test-project-1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tasks[0].totalTimeSpent).toBe(350);
    }
  });

  it("sets totalTimeSpent to 0 when task has no time entries", async () => {
    mockProjectWithTasks([
      makeDbTask({ id: "task-1", parentId: null, timeEntries: [] }),
    ]);

    const result = await getProjectTaskTree({
      userId: "test-user-1",
      projectId: "test-project-1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tasks[0].totalTimeSpent).toBe(0);
    }
  });

  it("rolls up totalTimeSpent from children to parent", async () => {
    mockProjectWithTasks([
      makeDbTask({
        id: "parent",
        parentId: null,
        timeEntries: [{ duration: 100 }],
      }),
      makeDbTask({
        id: "child-a",
        parentId: "parent",
        timeEntries: [{ duration: 200 }, { duration: 50 }],
      }),
      makeDbTask({
        id: "child-b",
        parentId: "parent",
        timeEntries: [{ duration: 300 }],
      }),
    ]);

    const result = await getProjectTaskTree({
      userId: "test-user-1",
      projectId: "test-project-1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      const parent = result.data.tasks.find((t: any) => t.id === "parent")!;
      // parent own: 100, child-a: 250, child-b: 300 → total: 650
      expect(parent.totalTimeSpent).toBe(650);
      expect(
        parent.children.find((c: any) => c.id === "child-a")!.totalTimeSpent,
      ).toBe(250);
      expect(
        parent.children.find((c: any) => c.id === "child-b")!.totalTimeSpent,
      ).toBe(300);
    }
  });

  it("rolls up totalTimeSpent recursively through 3 levels", async () => {
    mockProjectWithTasks([
      makeDbTask({
        id: "root",
        parentId: null,
        timeEntries: [{ duration: 10 }],
      }),
      makeDbTask({
        id: "mid",
        parentId: "root",
        timeEntries: [{ duration: 20 }],
      }),
      makeDbTask({
        id: "leaf",
        parentId: "mid",
        timeEntries: [{ duration: 30 }],
      }),
    ]);

    const result = await getProjectTaskTree({
      userId: "test-user-1",
      projectId: "test-project-1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      const root = result.data.tasks.find((t: any) => t.id === "root")!;
      expect(root.children[0].children[0].totalTimeSpent).toBe(30); // leaf: own only
      expect(root.children[0].totalTimeSpent).toBe(50); // mid: 20 + 30
      expect(root.totalTimeSpent).toBe(60); // root: 10 + 50
    }
  });

  // ─── Status derivation ─────────────────────────────────────────────────────

  it("sets status to IN_PROGRESS for the active task", async () => {
    mockProjectWithTasks([
      makeDbTask({ id: "task-1", parentId: null, completedAt: null }),
      makeDbTask({ id: "task-2", parentId: null, completedAt: null }),
    ]);
    mockGetActiveTimer.mockResolvedValue({
      success: true,
      data: { taskId: "task-2", startedAt: new Date() },
    });

    const result = await getProjectTaskTree({
      userId: "test-user-1",
      projectId: "test-project-1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      const task1 = result.data.tasks.find((t: any) => t.id === "task-1")!;
      const task2 = result.data.tasks.find((t: any) => t.id === "task-2")!;
      expect(task1.status).toBe("OPEN");
      expect(task2.status).toBe("IN_PROGRESS");
    }
  });

  it("sets status to DONE for completed tasks", async () => {
    mockProjectWithTasks([
      makeDbTask({
        id: "task-1",
        parentId: null,
        completedAt: new Date("2026-01-15"),
      }),
    ]);

    const result = await getProjectTaskTree({
      userId: "test-user-1",
      projectId: "test-project-1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tasks[0].status).toBe("DONE");
    }
  });

  it("completedAt takes priority over active timer (DONE not IN_PROGRESS)", async () => {
    mockProjectWithTasks([
      makeDbTask({
        id: "task-1",
        parentId: null,
        completedAt: new Date("2026-01-15"),
      }),
    ]);
    mockGetActiveTimer.mockResolvedValue({
      success: true,
      data: { taskId: "task-1", startedAt: new Date() },
    });

    const result = await getProjectTaskTree({
      userId: "test-user-1",
      projectId: "test-project-1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tasks[0].status).toBe("DONE");
    }
  });

  // ─── hasActiveDescendant ───────────────────────────────────────────────────

  it("sets hasActiveDescendant on parent when child is IN_PROGRESS", async () => {
    mockProjectWithTasks([
      makeDbTask({ id: "parent", parentId: null }),
      makeDbTask({ id: "child", parentId: "parent" }),
    ]);
    mockGetActiveTimer.mockResolvedValue({
      success: true,
      data: { taskId: "child", startedAt: new Date() },
    });

    const result = await getProjectTaskTree({
      userId: "test-user-1",
      projectId: "test-project-1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      const parent = result.data.tasks.find((t: any) => t.id === "parent")!;
      expect(parent.hasActiveDescendant).toBe(true);
      expect(parent.status).toBe("OPEN");
      expect(parent.children[0].status).toBe("IN_PROGRESS");
    }
  });

  it("propagates hasActiveDescendant through multiple ancestor levels", async () => {
    mockProjectWithTasks([
      makeDbTask({ id: "root", parentId: null }),
      makeDbTask({ id: "mid", parentId: "root" }),
      makeDbTask({ id: "leaf", parentId: "mid" }),
    ]);
    mockGetActiveTimer.mockResolvedValue({
      success: true,
      data: { taskId: "leaf", startedAt: new Date() },
    });

    const result = await getProjectTaskTree({
      userId: "test-user-1",
      projectId: "test-project-1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      const root = result.data.tasks.find((t: any) => t.id === "root")!;
      expect(root.hasActiveDescendant).toBe(true);
      expect(root.children[0].hasActiveDescendant).toBe(true); // mid
      expect(root.children[0].children[0].status).toBe("IN_PROGRESS"); // leaf
    }
  });

  it("does not set hasActiveDescendant when no descendants are active", async () => {
    mockProjectWithTasks([
      makeDbTask({ id: "parent", parentId: null }),
      makeDbTask({ id: "child", parentId: "parent" }),
    ]);

    const result = await getProjectTaskTree({
      userId: "test-user-1",
      projectId: "test-project-1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      const parent = result.data.tasks.find((t: any) => t.id === "parent")!;
      expect(parent.hasActiveDescendant).toBe(false);
    }
  });

  // ─── Tree structure ────────────────────────────────────────────────────────

  it("builds correct parent-child tree structure", async () => {
    mockProjectWithTasks([
      makeDbTask({ id: "root-1", parentId: null }),
      makeDbTask({ id: "root-2", parentId: null }),
      makeDbTask({ id: "child-1a", parentId: "root-1" }),
      makeDbTask({ id: "child-1b", parentId: "root-1" }),
      makeDbTask({ id: "child-2a", parentId: "root-2" }),
    ]);

    const result = await getProjectTaskTree({
      userId: "test-user-1",
      projectId: "test-project-1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tasks).toHaveLength(2);
      const root1 = result.data.tasks.find((t: any) => t.id === "root-1")!;
      const root2 = result.data.tasks.find((t: any) => t.id === "root-2")!;
      expect(root1.children).toHaveLength(2);
      expect(root2.children).toHaveLength(1);
    }
  });

  // ─── Error handling ────────────────────────────────────────────────────────

  it("returns NOT_FOUND when project does not exist", async () => {
    db.project.findUnique.mockResolvedValue(null);

    const result = await getProjectTaskTree({
      userId: "test-user-1",
      projectId: "test-project-1",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });

  it("returns NOT_FOUND when user does not own the project", async () => {
    db.project.findUnique.mockResolvedValue({
      ...buildProject(),
      userId: "other-user",
      tasks: [],
    });

    const result = await getProjectTaskTree({
      userId: "test-user-1",
      projectId: "test-project-1",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });

  it("returns UNEXPECTED_ERROR when getActiveTimeEntryForUser fails", async () => {
    mockProjectWithTasks([]);
    mockGetActiveTimer.mockResolvedValue({
      success: false,
      error: { code: "INTERNAL_SERVER_ERROR", message: "DB down" },
    });

    const result = await getProjectTaskTree({
      userId: "test-user-1",
      projectId: "test-project-1",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNEXPECTED_ERROR");
    }
  });

  // ─── timeEntries not leaked to output ──────────────────────────────────────

  it("does not include raw timeEntries in returned TaskNode objects", async () => {
    mockProjectWithTasks([
      makeDbTask({
        id: "task-1",
        parentId: null,
        timeEntries: [{ duration: 100 }],
      }),
    ]);

    const result = await getProjectTaskTree({
      userId: "test-user-1",
      projectId: "test-project-1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tasks[0]).not.toHaveProperty("timeEntries");
    }
  });
});
