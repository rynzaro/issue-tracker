import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildTask, buildProject } from "@/tests/helpers/factories";

// Mock external dependencies
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/services/project.service", () => ({
  createProject: vi.fn(),
  getUserProjectById: vi.fn(),
  getUserProjectWithTasks: vi.fn(),
}));

vi.mock("@/lib/services/activeTask.service", () => ({
  getActiveTimeEntryForUser: vi.fn(),
}));

import { auth } from "@/auth";
import { getUserProjectWithTasks } from "@/lib/services/project.service";
import { getActiveTimeEntryForUser } from "@/lib/services/activeTask.service";
import { getUserProjectWithTasksAndChildrenAction } from "@/lib/actions/project.actions";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockGetProject = getUserProjectWithTasks as ReturnType<typeof vi.fn>;
const mockGetActiveTimer = getActiveTimeEntryForUser as ReturnType<
  typeof vi.fn
>;

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    ...buildTask(),
    todoItems: [],
    taskTags: [],
    timeEntries: [],
    ...overrides,
  };
}

describe("getUserProjectWithTasksAndChildrenAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: "test-user-1" },
    });
  });

  it("computes totalTimeSpent from timeEntries durations", async () => {
    const project = {
      ...buildProject(),
      userId: "test-user-1",
      tasks: [
        makeTask({
          id: "task-1",
          parentId: null,
          timeEntries: [{ duration: 100 }, { duration: 200 }, { duration: 50 }],
        }),
      ],
    };

    mockGetProject.mockResolvedValue({ success: true, data: project });
    mockGetActiveTimer.mockResolvedValue({ success: true, data: null });

    const result = await getUserProjectWithTasksAndChildrenAction({
      projectId: "test-project-1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tasks[0].totalTimeSpent).toBe(350);
    }
  });

  it("sets totalTimeSpent to 0 when task has no time entries", async () => {
    const project = {
      ...buildProject(),
      userId: "test-user-1",
      tasks: [makeTask({ id: "task-1", parentId: null, timeEntries: [] })],
    };

    mockGetProject.mockResolvedValue({ success: true, data: project });
    mockGetActiveTimer.mockResolvedValue({ success: true, data: null });

    const result = await getUserProjectWithTasksAndChildrenAction({
      projectId: "test-project-1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tasks[0].totalTimeSpent).toBe(0);
    }
  });

  it("sets status to IN_PROGRESS for the active task", async () => {
    const project = {
      ...buildProject(),
      userId: "test-user-1",
      tasks: [
        makeTask({ id: "task-1", parentId: null, completedAt: null }),
        makeTask({ id: "task-2", parentId: null, completedAt: null }),
      ],
    };

    mockGetProject.mockResolvedValue({ success: true, data: project });
    mockGetActiveTimer.mockResolvedValue({
      success: true,
      data: { taskId: "task-2" },
    });

    const result = await getUserProjectWithTasksAndChildrenAction({
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
    const project = {
      ...buildProject(),
      userId: "test-user-1",
      tasks: [
        makeTask({
          id: "task-1",
          parentId: null,
          completedAt: new Date("2026-01-15"),
        }),
      ],
    };

    mockGetProject.mockResolvedValue({ success: true, data: project });
    mockGetActiveTimer.mockResolvedValue({ success: true, data: null });

    const result = await getUserProjectWithTasksAndChildrenAction({
      projectId: "test-project-1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tasks[0].status).toBe("DONE");
    }
  });

  it("sets hasActiveDescendant on parent when child is IN_PROGRESS", async () => {
    const project = {
      ...buildProject(),
      userId: "test-user-1",
      tasks: [
        makeTask({ id: "parent", parentId: null }),
        makeTask({ id: "child", parentId: "parent" }),
      ],
    };

    mockGetProject.mockResolvedValue({ success: true, data: project });
    mockGetActiveTimer.mockResolvedValue({
      success: true,
      data: { taskId: "child" },
    });

    const result = await getUserProjectWithTasksAndChildrenAction({
      projectId: "test-project-1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      const parent = result.data.tasks.find((t: any) => t.id === "parent")!;
      expect(parent.hasActiveDescendant).toBe(true);
      expect(parent.status).toBe("OPEN"); // Parent itself is not IN_PROGRESS
      expect(parent.children[0].status).toBe("IN_PROGRESS");
    }
  });

  it("propagates hasActiveDescendant through multiple ancestor levels", async () => {
    const project = {
      ...buildProject(),
      userId: "test-user-1",
      tasks: [
        makeTask({ id: "root", parentId: null }),
        makeTask({ id: "mid", parentId: "root" }),
        makeTask({ id: "leaf", parentId: "mid" }),
      ],
    };

    mockGetProject.mockResolvedValue({ success: true, data: project });
    mockGetActiveTimer.mockResolvedValue({
      success: true,
      data: { taskId: "leaf" },
    });

    const result = await getUserProjectWithTasksAndChildrenAction({
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
    const project = {
      ...buildProject(),
      userId: "test-user-1",
      tasks: [
        makeTask({ id: "parent", parentId: null }),
        makeTask({ id: "child", parentId: "parent" }),
      ],
    };

    mockGetProject.mockResolvedValue({ success: true, data: project });
    mockGetActiveTimer.mockResolvedValue({ success: true, data: null });

    const result = await getUserProjectWithTasksAndChildrenAction({
      projectId: "test-project-1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      const parent = result.data.tasks.find((t: any) => t.id === "parent")!;
      expect(parent.hasActiveDescendant).toBe(false);
    }
  });

  it("builds correct parent-child tree structure", async () => {
    const project = {
      ...buildProject(),
      userId: "test-user-1",
      tasks: [
        makeTask({ id: "root-1", parentId: null }),
        makeTask({ id: "root-2", parentId: null }),
        makeTask({ id: "child-1a", parentId: "root-1" }),
        makeTask({ id: "child-1b", parentId: "root-1" }),
        makeTask({ id: "child-2a", parentId: "root-2" }),
      ],
    };

    mockGetProject.mockResolvedValue({ success: true, data: project });
    mockGetActiveTimer.mockResolvedValue({ success: true, data: null });

    const result = await getUserProjectWithTasksAndChildrenAction({
      projectId: "test-project-1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // Two root tasks
      expect(result.data.tasks).toHaveLength(2);
      const root1 = result.data.tasks.find((t: any) => t.id === "root-1")!;
      const root2 = result.data.tasks.find((t: any) => t.id === "root-2")!;
      expect(root1.children).toHaveLength(2);
      expect(root2.children).toHaveLength(1);
    }
  });

  it("rolls up totalTimeSpent from children to parent", async () => {
    const project = {
      ...buildProject(),
      userId: "test-user-1",
      tasks: [
        makeTask({
          id: "parent",
          parentId: null,
          timeEntries: [{ duration: 100 }],
        }),
        makeTask({
          id: "child-a",
          parentId: "parent",
          timeEntries: [{ duration: 200 }, { duration: 50 }],
        }),
        makeTask({
          id: "child-b",
          parentId: "parent",
          timeEntries: [{ duration: 300 }],
        }),
      ],
    };

    mockGetProject.mockResolvedValue({ success: true, data: project });
    mockGetActiveTimer.mockResolvedValue({ success: true, data: null });

    const result = await getUserProjectWithTasksAndChildrenAction({
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
    const project = {
      ...buildProject(),
      userId: "test-user-1",
      tasks: [
        makeTask({
          id: "root",
          parentId: null,
          timeEntries: [{ duration: 10 }],
        }),
        makeTask({
          id: "mid",
          parentId: "root",
          timeEntries: [{ duration: 20 }],
        }),
        makeTask({
          id: "leaf",
          parentId: "mid",
          timeEntries: [{ duration: 30 }],
        }),
      ],
    };

    mockGetProject.mockResolvedValue({ success: true, data: project });
    mockGetActiveTimer.mockResolvedValue({ success: true, data: null });

    const result = await getUserProjectWithTasksAndChildrenAction({
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

  it("returns AUTHORIZATION_ERROR when user is not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await getUserProjectWithTasksAndChildrenAction({
      projectId: "test-project-1",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("AUTHORIZATION_ERROR");
    }
  });

  it("returns UNEXPECTED_ERROR when getActiveTimeEntryForUser fails", async () => {
    const project = {
      ...buildProject(),
      userId: "test-user-1",
      tasks: [],
    };

    mockGetProject.mockResolvedValue({ success: true, data: project });
    mockGetActiveTimer.mockResolvedValue({
      success: false,
      error: { code: "INTERNAL_SERVER_ERROR", message: "DB down" },
    });

    const result = await getUserProjectWithTasksAndChildrenAction({
      projectId: "test-project-1",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNEXPECTED_ERROR");
    }
  });

  it("completedAt takes priority over active timer (DONE not IN_PROGRESS)", async () => {
    const project = {
      ...buildProject(),
      userId: "test-user-1",
      tasks: [
        makeTask({
          id: "task-1",
          parentId: null,
          completedAt: new Date("2026-01-15"),
        }),
      ],
    };

    // Active timer points to a completed task (edge case)
    mockGetProject.mockResolvedValue({ success: true, data: project });
    mockGetActiveTimer.mockResolvedValue({
      success: true,
      data: { taskId: "task-1" },
    });

    const result = await getUserProjectWithTasksAndChildrenAction({
      projectId: "test-project-1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // completedAt check comes first, so status should be DONE
      expect(result.data.tasks[0].status).toBe("DONE");
    }
  });
});
