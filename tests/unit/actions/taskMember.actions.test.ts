import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Valid CUIDs for action tests ────────────────────────────────────────────

const VALID_TASK_ID = "clz1234567890abcdefghijkl";
const VALID_MEMBER_ID = "clz2345678901bcdefghijklm";
const VALID_OWNER_ID = "clz3456789012cdefghijklmn";

// ─── Mock external dependencies ────────────────────────────────────────────────

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/services/taskMember.service", () => ({
  addTaskMember: vi.fn(),
  removeTaskMember: vi.fn(),
}));

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import {
  addTaskMember,
  removeTaskMember,
} from "@/lib/services/taskMember.service";
import {
  addTaskMemberAction,
  removeTaskMemberAction,
} from "@/lib/actions/taskMember.actions";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockRevalidatePath = revalidatePath as ReturnType<typeof vi.fn>;
const mockAddTaskMember = addTaskMember as ReturnType<typeof vi.fn>;
const mockRemoveTaskMember = removeTaskMember as ReturnType<typeof vi.fn>;

// ─── addTaskMemberAction ───────────────────────────────────────────────────────

describe("addTaskMemberAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: VALID_OWNER_ID } });
    mockAddTaskMember.mockResolvedValue({
      success: true,
      data: { id: "membership-1", taskId: VALID_TASK_ID, userId: VALID_MEMBER_ID },
    });
  });

  it("returns AUTHORIZATION_ERROR when user is not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await addTaskMemberAction({
      taskId: VALID_TASK_ID,
      memberUserId: VALID_MEMBER_ID,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("AUTHORIZATION_ERROR");
    }
  });

  it("returns VALIDATION_ERROR when taskId is not a valid CUID", async () => {
    const result = await addTaskMemberAction({
      taskId: "not-a-cuid",
      memberUserId: VALID_MEMBER_ID,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("returns VALIDATION_ERROR when memberUserId is not a valid CUID", async () => {
    const result = await addTaskMemberAction({
      taskId: VALID_TASK_ID,
      memberUserId: "not-a-cuid",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("delegates to addTaskMember and returns its success response", async () => {
    const result = await addTaskMemberAction({
      taskId: VALID_TASK_ID,
      memberUserId: VALID_MEMBER_ID,
    });

    expect(result.success).toBe(true);
    expect(mockAddTaskMember).toHaveBeenCalledWith({
      taskId: VALID_TASK_ID,
      memberUserId: VALID_MEMBER_ID,
      ownerUserId: VALID_OWNER_ID,
    });
  });

  it("revalidates project layout on success", async () => {
    await addTaskMemberAction({
      taskId: VALID_TASK_ID,
      memberUserId: VALID_MEMBER_ID,
    });

    expect(mockRevalidatePath).toHaveBeenCalledWith("/s/project", "layout");
  });

  it("does not revalidate when addTaskMember fails", async () => {
    mockAddTaskMember.mockResolvedValue({
      success: false,
      error: { code: "NOT_FOUND", message: "Task not found" },
    });

    const result = await addTaskMemberAction({
      taskId: VALID_TASK_ID,
      memberUserId: VALID_MEMBER_ID,
    });

    expect(result.success).toBe(false);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});

// ─── removeTaskMemberAction ──────────────────────────────────────────────────────

describe("removeTaskMemberAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: VALID_OWNER_ID } });
    mockRemoveTaskMember.mockResolvedValue({
      success: true,
      data: { removedCount: 2 },
    });
  });

  it("returns AUTHORIZATION_ERROR when user is not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await removeTaskMemberAction({
      taskId: VALID_TASK_ID,
      memberUserId: VALID_MEMBER_ID,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("AUTHORIZATION_ERROR");
    }
  });

  it("returns VALIDATION_ERROR when taskId is not a valid CUID", async () => {
    const result = await removeTaskMemberAction({
      taskId: "not-a-cuid",
      memberUserId: VALID_MEMBER_ID,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("returns VALIDATION_ERROR when memberUserId is not a valid CUID", async () => {
    const result = await removeTaskMemberAction({
      taskId: VALID_TASK_ID,
      memberUserId: "not-a-cuid",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("delegates to removeTaskMember and returns its success response", async () => {
    const result = await removeTaskMemberAction({
      taskId: VALID_TASK_ID,
      memberUserId: VALID_MEMBER_ID,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.removedCount).toBe(2);
    }
    expect(mockRemoveTaskMember).toHaveBeenCalledWith({
      taskId: VALID_TASK_ID,
      memberUserId: VALID_MEMBER_ID,
      ownerUserId: VALID_OWNER_ID,
    });
  });

  it("revalidates project layout on success", async () => {
    await removeTaskMemberAction({
      taskId: VALID_TASK_ID,
      memberUserId: VALID_MEMBER_ID,
    });

    expect(mockRevalidatePath).toHaveBeenCalledWith("/s/project", "layout");
  });

  it("does not revalidate when removeTaskMember fails", async () => {
    mockRemoveTaskMember.mockResolvedValue({
      success: false,
      error: { code: "NOT_FOUND", message: "Membership not found" },
    });

    const result = await removeTaskMemberAction({
      taskId: VALID_TASK_ID,
      memberUserId: VALID_MEMBER_ID,
    });

    expect(result.success).toBe(false);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});
