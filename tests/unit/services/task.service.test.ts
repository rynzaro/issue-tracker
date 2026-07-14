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
  updateTask,
  createTask,
  deleteTask,
  completeTask,
  archiveTask,
} from "@/lib/services/task.service";
import prisma from "@/lib/prisma";

const db = prisma as unknown as MockPrismaClient;
const tx = mockTx as MockTx;

// Subtask events are asserted by filtering for the specific eventType, never by
// "taskEvent.create was never called" — sibling tickets (#51 CREATED, #54
// DELETED) add other events on these same paths, and these assertions must stay
// green after those merges.
const subtaskEventCalls = (type: TaskEventType) =>
  tx.taskEvent.create.mock.calls.filter(
    (call: unknown[]) =>
      (call[0] as { data?: { eventType?: TaskEventType } } | undefined)?.data
        ?.eventType === type,
  );

// Minimal LineageNode row as returned by the hierarchy fetches
// (getAllAncestors / collectDescendantNodes selects).
const lineageNode = (id: string, parentId: string | null) => ({
  id,
  parentId,
  completedAt: null,
  archivedAt: null,
  deletedAt: null,
});

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

describe("updateTask — TAGS_CHANGED event", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Route the mutation's transaction through the shared tx mock.
    db.$transaction.mockImplementation((fn: (client: MockTx) => unknown) =>
      fn(tx),
    );
    // Owner passes the access check (select is { project: { userId } }).
    db.task.findUnique.mockResolvedValue({
      project: { userId: "test-user-1" },
    });
    tx.task.update.mockResolvedValue(buildTask());
    tx.taskEvent.create.mockResolvedValue({ id: "event-1" });
  });

  it("emits one TAGS_CHANGED with the before/after tag-id sets when tags change", async () => {
    tx.taskTag.findMany.mockResolvedValue([{ tagId: 1 }, { tagId: 2 }]);

    const result = await updateTask({
      userId: "test-user-1",
      updateTaskParams: {
        id: "test-task-1",
        title: "Test Task",
        tagIds: [2, 3],
      },
    });

    expect(result.success).toBe(true);
    expect(tx.taskEvent.create).toHaveBeenCalledTimes(1);
    expect(tx.taskEvent.create).toHaveBeenCalledWith({
      data: {
        taskId: "test-task-1",
        userId: "test-user-1",
        eventType: TaskEventType.TAGS_CHANGED,
        payload: { old: [1, 2], new: [2, 3] },
      },
    });
  });

  it("does not emit when the same tag set is re-submitted (order-independent)", async () => {
    tx.taskTag.findMany.mockResolvedValue([{ tagId: 1 }, { tagId: 2 }]);

    const result = await updateTask({
      userId: "test-user-1",
      updateTaskParams: {
        id: "test-task-1",
        title: "Test Task",
        tagIds: [2, 1],
      },
    });

    expect(result.success).toBe(true);
    // The write still runs; only the spurious event is suppressed.
    expect(tx.task.update).toHaveBeenCalledTimes(1);
    expect(tx.taskEvent.create).not.toHaveBeenCalled();
  });

  it("does not read or emit tags when tagIds is null (tags untouched)", async () => {
    const result = await updateTask({
      userId: "test-user-1",
      updateTaskParams: { id: "test-task-1", title: "Renamed", tagIds: null },
    });

    expect(result.success).toBe(true);
    expect(tx.task.update).toHaveBeenCalledTimes(1);
    expect(tx.taskTag.findMany).not.toHaveBeenCalled();
    expect(tx.taskEvent.create).not.toHaveBeenCalled();
  });

  it("captures old as an empty set when first tagging an untagged task", async () => {
    tx.taskTag.findMany.mockResolvedValue([]);

    await updateTask({
      userId: "test-user-1",
      updateTaskParams: { id: "test-task-1", title: "Test Task", tagIds: [5] },
    });

    expect(tx.taskEvent.create).toHaveBeenCalledWith({
      data: {
        taskId: "test-task-1",
        userId: "test-user-1",
        eventType: TaskEventType.TAGS_CHANGED,
        payload: { old: [], new: [5] },
      },
    });
  });
});

describe("createTask — SUBTASK_CREATED events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.$transaction.mockImplementation((fn: (tx: MockTx) => unknown) => fn(tx));
    tx.taskEvent.create.mockResolvedValue({ id: "event-1" });
  });

  it("emits SUBTASK_CREATED on the direct parent when a subtask is created under it", async () => {
    db.project.findUnique.mockResolvedValue({ userId: "test-user-1" });
    db.task.findUnique.mockResolvedValue({ id: "parent-1" }); // parent existence check
    tx.task.create.mockResolvedValue(
      buildTask({ id: "child-1", title: "Child task", parentId: "parent-1" }),
    );

    const result = await createTask({
      userId: "test-user-1",
      createTaskParams: {
        projectId: "test-project-1",
        parentId: "parent-1",
        title: "Child task",
      },
    });

    expect(result.success).toBe(true);
    // Exactly one SUBTASK_CREATED, targeting the direct parent — not the new
    // task itself, not any ancestor above the parent.
    const createdEvents = subtaskEventCalls(TaskEventType.SUBTASK_CREATED);
    expect(createdEvents).toHaveLength(1);
    expect(createdEvents[0][0]).toEqual({
      data: {
        taskId: "parent-1",
        userId: "test-user-1",
        eventType: TaskEventType.SUBTASK_CREATED,
        payload: { childTaskId: "child-1", childTitle: "Child task" },
      },
    });
  });

  it("does not emit SUBTASK_CREATED when a top-level task is created without a parent", async () => {
    db.project.findUnique.mockResolvedValue({ userId: "test-user-1" });
    tx.task.create.mockResolvedValue(
      buildTask({ id: "root-1", title: "Root task", parentId: null }),
    );

    const result = await createTask({
      userId: "test-user-1",
      createTaskParams: {
        projectId: "test-project-1",
        parentId: null,
        title: "Root task",
      },
    });

    expect(result.success).toBe(true);
    expect(subtaskEventCalls(TaskEventType.SUBTASK_CREATED)).toHaveLength(0);
  });
});

describe("deleteTask — SUBTASK_REMOVED events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.$transaction.mockImplementation((fn: (tx: MockTx) => unknown) => fn(tx));
    tx.activeTimer.findFirst.mockResolvedValue(null);
    tx.task.updateMany.mockResolvedValue({ count: 1 });
    tx.taskEvent.create.mockResolvedValue({ id: "event-1" });
  });

  it("emits SUBTASK_REMOVED on the former direct parent when a subtask is deleted", async () => {
    db.task.findUnique.mockResolvedValue(
      buildTask({
        id: "child-1",
        title: "Child task",
        parentId: "parent-1",
        project: { userId: "test-user-1" },
      }),
    );
    // getAllAncestors → parent-1 is a root (no further parent)
    tx.task.findUnique.mockResolvedValue(lineageNode("parent-1", null));
    // collectDescendantNodes → child-1 is a leaf
    tx.task.findMany.mockResolvedValue([lineageNode("child-1", "parent-1")]);

    const result = await deleteTask({
      taskId: "child-1",
      userId: "test-user-1",
    });

    expect(result.success).toBe(true);
    expect(tx.taskEvent.create).toHaveBeenCalledWith({
      data: {
        taskId: "parent-1",
        userId: "test-user-1",
        eventType: TaskEventType.SUBTASK_REMOVED,
        payload: { childTaskId: "child-1", childTitle: "Child task" },
      },
    });
  });

  it("emits no SUBTASK_REMOVED when deleting a top-level subtree (cascade only)", async () => {
    // Deleting a root task cascades to its descendants; none of those cascaded
    // removals emit, and the root itself has no parent to notify.
    db.task.findUnique.mockResolvedValue(
      buildTask({
        id: "parent-1",
        title: "Parent",
        parentId: null,
        project: { userId: "test-user-1" },
      }),
    );
    tx.task.findMany.mockResolvedValue([
      lineageNode("parent-1", null),
      lineageNode("child-1", "parent-1"),
      lineageNode("grandchild-1", "child-1"),
    ]);

    const result = await deleteTask({
      taskId: "parent-1",
      userId: "test-user-1",
    });

    expect(result.success).toBe(true);
    expect(subtaskEventCalls(TaskEventType.SUBTASK_REMOVED)).toHaveLength(0);
  });

  it("emits SUBTASK_REMOVED for the directly-deleted task only, never its cascaded children", async () => {
    // Delete a mid-level task that has both a parent (top-1) and a child
    // (grandchild-1). Only the direct removal (middle-1 from top-1) emits.
    db.task.findUnique.mockResolvedValue(
      buildTask({
        id: "middle-1",
        title: "Middle",
        parentId: "top-1",
        project: { userId: "test-user-1" },
      }),
    );
    tx.task.findUnique.mockResolvedValue(lineageNode("top-1", null));
    tx.task.findMany.mockResolvedValue([
      lineageNode("middle-1", "top-1"),
      lineageNode("grandchild-1", "middle-1"),
    ]);

    await deleteTask({ taskId: "middle-1", userId: "test-user-1" });

    const removed = subtaskEventCalls(TaskEventType.SUBTASK_REMOVED);
    expect(removed).toHaveLength(1);
    expect(removed[0][0]).toEqual({
      data: {
        taskId: "top-1",
        userId: "test-user-1",
        eventType: TaskEventType.SUBTASK_REMOVED,
        payload: { childTaskId: "middle-1", childTitle: "Middle" },
      },
    });
    // Never for the cascaded grandchild.
    expect(tx.taskEvent.create).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: TaskEventType.SUBTASK_REMOVED,
          payload: expect.objectContaining({ childTaskId: "grandchild-1" }),
        }),
      }),
    );
  });
});

describe("completeTask / archiveTask — no subtask events on cascades", () => {
  // AC #52: cascading operations (complete/archive on a subtree) never emit
  // SUBTASK_CREATED/SUBTASK_REMOVED. Assertions filter for the two subtask
  // types only, so they stay green once #54 wires COMPLETED/ARCHIVED events
  // onto these same paths.
  const subtree = [
    lineageNode("parent-1", null),
    lineageNode("child-1", "parent-1"),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    db.$transaction.mockImplementation((fn: (tx: MockTx) => unknown) => fn(tx));
    tx.activeTimer.findFirst.mockResolvedValue(null);
    tx.task.updateMany.mockResolvedValue({ count: 2 });
    tx.taskEvent.create.mockResolvedValue({ id: "event-1" });
    db.task.findUnique.mockResolvedValue(
      buildTask({
        id: "parent-1",
        title: "Parent",
        parentId: null,
        project: { userId: "test-user-1" },
      }),
    );
    tx.task.findMany.mockResolvedValue(subtree);
  });

  it("completing a subtree emits no SUBTASK_CREATED/SUBTASK_REMOVED", async () => {
    const result = await completeTask({
      taskId: "parent-1",
      userId: "test-user-1",
    });

    expect(result.success).toBe(true);
    expect(subtaskEventCalls(TaskEventType.SUBTASK_CREATED)).toHaveLength(0);
    expect(subtaskEventCalls(TaskEventType.SUBTASK_REMOVED)).toHaveLength(0);
  });

  it("archiving a subtree emits no SUBTASK_CREATED/SUBTASK_REMOVED", async () => {
    const result = await archiveTask({
      taskId: "parent-1",
      userId: "test-user-1",
    });

    expect(result.success).toBe(true);
    expect(subtaskEventCalls(TaskEventType.SUBTASK_CREATED)).toHaveLength(0);
    expect(subtaskEventCalls(TaskEventType.SUBTASK_REMOVED)).toHaveLength(0);
  });
});
