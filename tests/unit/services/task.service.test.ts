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
  uncompleteTask,
  archiveTask,
  unarchiveTask,
  restoreDeletedTask,
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
    // The in-transaction estimate snapshot; unestimated, so these tag tests
    // never trip ESTIMATE_CHANGED.
    tx.task.findUniqueOrThrow.mockResolvedValue({ estimate: null });
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

// The orchestrator's own contract (#62). The fetch filters on nothing but the
// id, so a task in the wrong state now reaches the policy and comes back with
// a real reason. Before, a per-kind `where` clause hid it as NOT_FOUND — the
// same rule written twice, disagreeing about what the user did wrong.
describe("applyTransition — the policy alone judges legality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.$transaction.mockImplementation((fn: (tx: MockTx) => unknown) => fn(tx));
    tx.activeTimer.findFirst.mockResolvedValue(null);
    tx.task.updateMany.mockResolvedValue({ count: 1 });
    tx.taskEvent.create.mockResolvedValue({ id: "event-1" });
    tx.task.findUnique.mockResolvedValue(null); // no ancestors
    tx.task.findMany.mockResolvedValue([]);
  });

  const targetInState = (overrides: Record<string, unknown>) =>
    buildTask({
      id: "t1",
      parentId: null,
      project: { userId: "test-user-1" },
      ...overrides,
    });

  // This is the assertion that pins the change. The prisma mock ignores `where`,
  // so a test that only reads the returned error would pass against the old
  // per-kind filters too; the fetch shape is what actually tells them apart.
  it.each([
    ["completeTask", completeTask],
    ["uncompleteTask", uncompleteTask],
    ["archiveTask", archiveTask],
    ["unarchiveTask", unarchiveTask],
    ["deleteTask", deleteTask],
    ["restoreDeletedTask", restoreDeletedTask],
  ])("%s fetches by id alone, with no state filter", async (_name, run) => {
    db.task.findUnique.mockResolvedValue(
      targetInState({ archivedAt: new Date(), deletedAt: new Date() }),
    );
    tx.task.findMany.mockResolvedValue([lineageNode("t1", null)]);

    await run({ taskId: "t1", userId: "test-user-1" });

    expect(db.task.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "t1" } }),
    );
  });

  it.each([
    ["archiveTask on an already-archived task", archiveTask, { archivedAt: new Date() }, "Task is already archived"],
    ["unarchiveTask on a task that is not archived", unarchiveTask, {}, "Task is not archived"],
    ["restoreDeletedTask on a task that is not deleted", restoreDeletedTask, {}, "Task is not deleted"],
    ["completeTask on a deleted task", completeTask, { deletedAt: new Date() }, "Task is deleted"],
    ["uncompleteTask on a task that is not completed", uncompleteTask, {}, "Task is not completed"],
  ])("%s says why, instead of NOT_FOUND", async (_name, run, state, reason) => {
    db.task.findUnique.mockResolvedValue(targetInState(state));

    const result = await run({ taskId: "t1", userId: "test-user-1" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe(reason);
      // The tree is fine, the move just is not allowed — and that reaches the
      // caller as its own code, not as NOT_FOUND and not as a fault (#14).
      expect(result.error.code).toBe("TRANSITION_INVALID");
    }
  });

  it("still reports NOT_FOUND when the task really does not exist", async () => {
    db.task.findUnique.mockResolvedValue(null);

    const result = await completeTask({ taskId: "gone", userId: "test-user-1" });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("NOT_FOUND");
  });

  it("checks the owner before opening a transaction", async () => {
    db.task.findUnique.mockResolvedValue(
      targetInState({ project: { userId: "someone-else" } }),
    );

    const result = await completeTask({ taskId: "t1", userId: "test-user-1" });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("AUTHORIZATION_ERROR");
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

// The timer guard belongs to the kinds that reach down the tree: a running
// timer below the target is only a problem when the target's state is about to
// land on it. Backward kinds repair upward and never scan.
describe("applyTransition — timer guard on the forward kinds only", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.$transaction.mockImplementation((fn: (tx: MockTx) => unknown) => fn(tx));
    tx.task.updateMany.mockResolvedValue({ count: 1 });
    tx.taskEvent.create.mockResolvedValue({ id: "event-1" });
    tx.task.findUnique.mockResolvedValue(null);
    tx.task.findMany.mockResolvedValue([lineageNode("t1", null)]);
  });

  it.each([
    ["completeTask", completeTask, "Task with active Timer cannot be marked as complete"],
    ["archiveTask", archiveTask, "Task with active Timer cannot be archived"],
    ["deleteTask", deleteTask, "Task with active Timer cannot be deleted"],
  ])("%s refuses while a timer runs in the subtree", async (_name, run, message) => {
    db.task.findUnique.mockResolvedValue(
      buildTask({ id: "t1", parentId: null, project: { userId: "test-user-1" } }),
    );
    tx.activeTimer.findFirst.mockResolvedValue(buildActiveTimer({ taskId: "t1" }));

    const result = await run({ taskId: "t1", userId: "test-user-1" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.message).toBe(message);
    }
    expect(tx.task.updateMany).not.toHaveBeenCalled();
  });

  it("unarchiveTask never scans for descendants or timers", async () => {
    db.task.findUnique.mockResolvedValue(
      buildTask({
        id: "t1",
        parentId: null,
        archivedAt: new Date(),
        project: { userId: "test-user-1" },
      }),
    );
    tx.activeTimer.findFirst.mockResolvedValue(buildActiveTimer({ taskId: "t1" }));

    const result = await unarchiveTask({ taskId: "t1", userId: "test-user-1" });

    expect(result.success).toBe(true);
    expect(tx.activeTimer.findFirst).not.toHaveBeenCalled();
    expect(tx.task.findMany).not.toHaveBeenCalled();
  });

  // How far a cascade reaches is the strength order's call. The service used to
  // encode part of it in the descendant fetch — DELETE included archived rows,
  // COMPLETE and ARCHIVE did not — which left the rule in two places. Now every
  // forward kind hands the policy the whole subtree.
  it.each([
    ["completeTask", completeTask],
    ["archiveTask", archiveTask],
    ["deleteTask", deleteTask],
  ])("%s scans the whole subtree, in whatever state", async (_name, run) => {
    db.task.findUnique.mockResolvedValue(
      buildTask({
        id: "t1",
        parentId: null,
        project: { userId: "test-user-1" },
      }),
    );
    tx.activeTimer.findFirst.mockResolvedValue(null);

    await run({ taskId: "t1", userId: "test-user-1" });

    expect(tx.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: "test-project-1", archivedAt: undefined, deletedAt: undefined },
      }),
    );
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

describe("createTask — CREATED event", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.$transaction.mockImplementation((fn: (client: MockTx) => unknown) =>
      fn(tx),
    );
    db.project.findUnique.mockResolvedValue({ userId: "test-user-1" });
    tx.taskEvent.create.mockResolvedValue({ id: "event-1" });
  });

  it("emits one CREATED event carrying title, estimate, and parentId, in the transaction", async () => {
    // Parent-existence check inside createTask
    db.task.findUnique.mockResolvedValue({ id: "parent-1" });
    tx.task.create.mockResolvedValue(
      buildTask({ id: "task-1", parentId: "parent-1", estimate: 60 }),
    );

    const result = await createTask({
      userId: "test-user-1",
      createTaskParams: {
        projectId: "project-1",
        parentId: "parent-1",
        title: "Write the docs",
        estimate: 60,
      },
    });

    expect(result.success).toBe(true);
    // One CREATED on the task; the sibling SUBTASK_CREATED on the parent (#52)
    // is asserted in its own suite.
    expect(subtaskEventCalls(TaskEventType.CREATED)).toHaveLength(1);
    expect(tx.taskEvent.create).toHaveBeenCalledWith({
      data: {
        taskId: "task-1",
        userId: "test-user-1",
        eventType: TaskEventType.CREATED,
        payload: {
          title: "Write the docs",
          estimate: 60,
          parentId: "parent-1",
        },
      },
    });
  });

  it("emits CREATED with only a title when the task has no estimate and no parent", async () => {
    tx.task.create.mockResolvedValue(
      buildTask({ id: "task-2", parentId: null, estimate: null }),
    );

    const result = await createTask({
      userId: "test-user-1",
      createTaskParams: {
        projectId: "project-1",
        parentId: null,
        title: "Solo task",
      },
    });

    expect(result.success).toBe(true);
    expect(tx.taskEvent.create).toHaveBeenCalledWith({
      data: {
        taskId: "task-2",
        userId: "test-user-1",
        eventType: TaskEventType.CREATED,
        payload: { title: "Solo task" },
      },
    });
  });

  it("does not emit ESTIMATE_CHANGED at creation, even when born with an estimate", async () => {
    tx.task.create.mockResolvedValue(
      buildTask({ id: "task-3", parentId: null, estimate: 90 }),
    );

    await createTask({
      userId: "test-user-1",
      createTaskParams: {
        projectId: "project-1",
        parentId: null,
        title: "Estimated at birth",
        estimate: 90,
      },
    });

    // Exactly one event, and it is CREATED — so no ESTIMATE_CHANGED rode along.
    expect(tx.taskEvent.create).toHaveBeenCalledTimes(1);
    expect(tx.taskEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: TaskEventType.CREATED }),
      }),
    );
  });
});

describe("updateTask — ESTIMATE_CHANGED event", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.$transaction.mockImplementation((fn: (client: MockTx) => unknown) =>
      fn(tx),
    );
    tx.taskEvent.create.mockResolvedValue({ id: "event-1" });
  });

  it("emits ESTIMATE_CHANGED with old and new when the estimate changes", async () => {
    db.task.findUnique.mockResolvedValue({
      project: { userId: "test-user-1" },
    });
    tx.task.findUniqueOrThrow.mockResolvedValue({ estimate: 60 });
    tx.task.update.mockResolvedValue(buildTask({ id: "task-1", estimate: 120 }));

    const result = await updateTask({
      userId: "test-user-1",
      updateTaskParams: {
        id: "task-1",
        title: "Updated title",
        estimate: 120,
        tagIds: null,
      },
    });

    expect(result.success).toBe(true);
    expect(tx.taskEvent.create).toHaveBeenCalledTimes(1);
    expect(tx.taskEvent.create).toHaveBeenCalledWith({
      data: {
        taskId: "task-1",
        userId: "test-user-1",
        eventType: TaskEventType.ESTIMATE_CHANGED,
        payload: { old: 60, new: 120 },
      },
    });
  });

  it("emits ESTIMATE_CHANGED with old null when setting an estimate on a task that had none", async () => {
    db.task.findUnique.mockResolvedValue({
      project: { userId: "test-user-1" },
    });
    tx.task.findUniqueOrThrow.mockResolvedValue({ estimate: null });
    tx.task.update.mockResolvedValue(buildTask({ id: "task-1", estimate: 45 }));

    await updateTask({
      userId: "test-user-1",
      updateTaskParams: {
        id: "task-1",
        title: "Now estimated",
        estimate: 45,
        tagIds: null,
      },
    });

    expect(tx.taskEvent.create).toHaveBeenCalledWith({
      data: {
        taskId: "task-1",
        userId: "test-user-1",
        eventType: TaskEventType.ESTIMATE_CHANGED,
        payload: { old: null, new: 45 },
      },
    });
  });

  it("does not emit ESTIMATE_CHANGED when the estimate is not part of the update", async () => {
    db.task.findUnique.mockResolvedValue({
      project: { userId: "test-user-1" },
    });
    tx.task.findUniqueOrThrow.mockResolvedValue({ estimate: 60 });
    tx.task.update.mockResolvedValue(buildTask({ id: "task-1", estimate: 60 }));

    await updateTask({
      userId: "test-user-1",
      updateTaskParams: {
        id: "task-1",
        title: "Only the title changed",
        tagIds: null,
      },
    });

    expect(tx.taskEvent.create).not.toHaveBeenCalled();
  });

  it("does not emit ESTIMATE_CHANGED when the estimate is unchanged", async () => {
    db.task.findUnique.mockResolvedValue({
      project: { userId: "test-user-1" },
    });
    tx.task.findUniqueOrThrow.mockResolvedValue({ estimate: 60 });
    tx.task.update.mockResolvedValue(buildTask({ id: "task-1", estimate: 60 }));

    await updateTask({
      userId: "test-user-1",
      updateTaskParams: {
        id: "task-1",
        title: "Re-saved with same estimate",
        estimate: 60,
        tagIds: null,
      },
    });

    expect(tx.taskEvent.create).not.toHaveBeenCalled();
  });
});
