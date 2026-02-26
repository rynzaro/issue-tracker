import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildTask, buildProject } from "@/tests/helpers/factories";

// ─── Valid CUID for tests (action validates with z.string().cuid()) ────────────
const VALID_PROJECT_ID = "clz1234567890abcdefghijkl";

// ─── Mock external dependencies ────────────────────────────────────────────────

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
  getProjectTaskTree: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
}));

import { auth } from "@/auth";
import { getProjectTaskTree } from "@/lib/services/project.service";
import { getUserProjectWithTasksAndChildrenAction } from "@/lib/actions/project.actions";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockGetProjectTaskTree = getProjectTaskTree as ReturnType<typeof vi.fn>;

// ─── Helper: build a TaskNode as returned by getProjectTaskTree ────────────────

function makeTaskNode(overrides: Record<string, unknown> = {}) {
  return {
    ...buildTask(),
    todoItems: [],
    taskTags: [],
    children: [],
    status: "OPEN",
    hasActiveDescendant: false,
    totalTimeSpent: 0,
    activeTimerStartedAt: null,
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

  // ─── Auth / Validation (action's own responsibilities) ─────────────────────

  it("returns AUTHORIZATION_ERROR when user is not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await getUserProjectWithTasksAndChildrenAction({
      projectId: VALID_PROJECT_ID,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("AUTHORIZATION_ERROR");
    }
  });

  it("returns VALIDATION_ERROR when projectId is not a valid CUID", async () => {
    const result = await getUserProjectWithTasksAndChildrenAction({
      projectId: "not-a-cuid",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  // ─── Delegation to getProjectTaskTree ──────────────────────────────────────

  it("delegates to getProjectTaskTree and returns its success response", async () => {
    const treeData = {
      ...buildProject({ id: VALID_PROJECT_ID }),
      tasks: [
        makeTaskNode({
          id: "task-1",
          parentId: null,
          totalTimeSpent: 350,
        }),
      ],
    };

    mockGetProjectTaskTree.mockResolvedValue({
      success: true,
      data: treeData,
    });

    const result = await getUserProjectWithTasksAndChildrenAction({
      projectId: VALID_PROJECT_ID,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tasks[0].totalTimeSpent).toBe(350);
    }
    expect(mockGetProjectTaskTree).toHaveBeenCalledWith({
      userId: "test-user-1",
      projectId: VALID_PROJECT_ID,
    });
  });

  it("passes through error response from getProjectTaskTree", async () => {
    mockGetProjectTaskTree.mockResolvedValue({
      success: false,
      error: { code: "NOT_FOUND", message: "Project not found" },
    });

    const result = await getUserProjectWithTasksAndChildrenAction({
      projectId: VALID_PROJECT_ID,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });

  it("does not call service when auth is missing", async () => {
    mockAuth.mockResolvedValue(null);

    await getUserProjectWithTasksAndChildrenAction({
      projectId: VALID_PROJECT_ID,
    });

    expect(mockGetProjectTaskTree).not.toHaveBeenCalled();
  });

  it("does not call service when projectId is invalid", async () => {
    await getUserProjectWithTasksAndChildrenAction({
      projectId: "bad-id",
    });

    expect(mockGetProjectTaskTree).not.toHaveBeenCalled();
  });
});
