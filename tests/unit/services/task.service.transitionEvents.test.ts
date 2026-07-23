import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockPrismaClient,
  mockTx,
  type MockPrismaClient,
} from "@/tests/helpers/prisma-mock";
import { buildTask } from "@/tests/helpers/factories";

vi.mock("@/lib/prisma", () => {
  const mock = createMockPrismaClient();
  return { default: mock };
});

import {
  completeTask,
  archiveTask,
  deleteTask,
  uncompleteTask,
  unarchiveTask,
  restoreDeletedTask,
} from "@/lib/services/task.service";
import prisma from "@/lib/prisma";

const db = prisma as unknown as MockPrismaClient;

const USER = "test-user-1";
const PROJECT = "test-project-1";

type Row = {
  id: string;
  parentId: string | null;
  completedAt: Date | null;
  archivedAt: Date | null;
  deletedAt: Date | null;
  createdById?: string;
  project?: { userId: string };
  members?: { userId: string }[];
};

function row(
  id: string,
  parentId: string | null,
  overrides: Partial<Row> = {},
): Row {
  return {
    id,
    parentId,
    completedAt: null,
    archivedAt: null,
    deletedAt: null,
    createdById: USER,
    project: { userId: USER },
    members: [],
    ...overrides,
  };
}

/** The target task as returned by the outer `client.task.findUnique`. */
function target(overrides: Partial<Row> = {}) {
  return buildTask({
    id: "root",
    parentId: null,
    projectId: PROJECT,
    project: { userId: USER },
    createdById: USER,
    members: [],
    ...overrides,
  });
}

/** Rows the in-transaction descendant scan (`tx.task.findMany`) returns. */
function tree(rows: Row[]) {
  mockTx.task.findMany.mockResolvedValue(rows);
  mockTx.activeTimer.findFirst.mockResolvedValue(null);
}

/**
 * Rows the in-transaction ancestor walk (`tx.task.findUnique`, one call per
 * parent) returns, keyed by id. Used by the upward-repair transitions.
 */
function ancestors(rows: Row[]) {
  const map = new Map(rows.map((r) => [r.id, r]));
  mockTx.task.findUnique.mockImplementation((args: { where: { id: string } }) =>
    Promise.resolve(map.get(args.where.id) ?? null),
  );
}

/** TaskEvent rows written during the call, in emission order. */
function emitted() {
  return mockTx.taskEvent.create.mock.calls.map(
    (c) => (c[0] as { data: Record<string, unknown> }).data,
  );
}

beforeEach(() => {
  // clearAllMocks resets call history but NOT implementations, so re-establish
  // happy-path defaults here — otherwise a test that makes an insert reject (see
  // the rollback case) or configures ancestors would leak into later tests.
  vi.clearAllMocks();
  mockTx.taskEvent.create.mockResolvedValue({});
  mockTx.task.findUnique.mockResolvedValue(null); // no ancestors unless a test sets them
});

describe("completeTask — event emission", () => {
  it("emits COMPLETED on a leaf target with no causedBy", async () => {
    db.task.findUnique.mockResolvedValue(target());
    tree([row("root", null)]);

    const result = await completeTask({ taskId: "root", userId: USER });

    expect(result.success).toBe(true);
    const events = emitted();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      taskId: "root",
      userId: USER,
      eventType: "COMPLETED",
      payload: { at: expect.any(String) },
    });
    expect(events[0].payload).not.toHaveProperty("causedBy");
  });

  it("cascades COMPLETED to every descendant with causedBy = the direct target", async () => {
    // root -> a -> b, none completed
    db.task.findUnique.mockResolvedValue(target());
    tree([row("root", null), row("a", "root"), row("b", "a")]);

    const result = await completeTask({ taskId: "root", userId: USER });

    expect(result.success).toBe(true);
    const events = emitted();
    expect(events).toHaveLength(3);

    const byTask = Object.fromEntries(events.map((e) => [e.taskId, e]));
    expect(byTask.root).toMatchObject({ eventType: "COMPLETED" });
    expect(byTask.root.payload).not.toHaveProperty("causedBy");
    // Even the deep descendant points at the direct target, not its parent.
    expect(byTask.a.payload).toMatchObject({ causedBy: "root" });
    expect(byTask.b.payload).toMatchObject({ causedBy: "root" });
    // Same verb type for direct act and cascade.
    expect(events.every((e) => e.eventType === "COMPLETED")).toBe(true);
    // One shared timestamp for the single authorized act.
    const ats = new Set(events.map((e) => (e.payload as { at: string }).at));
    expect(ats.size).toBe(1);
  });

  it("emits nothing for a subtree pruned by the #44 stop rule", async () => {
    // root -> a(completed) -> b : a is already completed, so a and b are pruned.
    db.task.findUnique.mockResolvedValue(target());
    tree([
      row("root", null),
      row("a", "root", { completedAt: new Date("2026-01-02") }),
      row("b", "a"),
    ]);

    const result = await completeTask({ taskId: "root", userId: USER });

    expect(result.success).toBe(true);
    const events = emitted();
    expect(events.map((e) => e.taskId)).toEqual(["root"]);
  });

  it("mixed branching tree: fresh branch cascades while the in-state sibling branch stays silent", async () => {
    // root ─┬─ a ─ b          (fresh → cascade, causedBy = root)
    //       └─ c* ─ d*        (already completed → pruned, no events)
    const done = new Date("2026-01-02");
    db.task.findUnique.mockResolvedValue(target());
    tree([
      row("root", null),
      row("a", "root"),
      row("b", "a"),
      row("c", "root", { completedAt: done }),
      row("d", "c", { completedAt: done }),
    ]);

    const result = await completeTask({ taskId: "root", userId: USER });

    expect(result.success).toBe(true);
    const events = emitted();
    expect(events.map((e) => e.taskId).sort()).toEqual(["a", "b", "root"]);
    expect(events.every((e) => e.eventType === "COMPLETED")).toBe(true);

    const byTask = Object.fromEntries(events.map((e) => [e.taskId, e]));
    expect(byTask.root.payload).not.toHaveProperty("causedBy");
    expect(byTask.a.payload).toMatchObject({ causedBy: "root" });
    expect(byTask.b.payload).toMatchObject({ causedBy: "root" });
  });
});

describe("archiveTask — event emission", () => {
  it("emits ARCHIVED on a leaf target with no causedBy", async () => {
    db.task.findUnique.mockResolvedValue(target());
    tree([row("root", null)]);

    const result = await archiveTask({ taskId: "root", userId: USER });

    expect(result.success).toBe(true);
    const events = emitted();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      taskId: "root",
      userId: USER,
      eventType: "ARCHIVED",
      payload: { at: expect.any(String) },
    });
    expect(events[0].payload).not.toHaveProperty("causedBy");
  });

  it("cascades ARCHIVED to descendants; direct target has no causedBy", async () => {
    // root -> a -> b, none archived
    db.task.findUnique.mockResolvedValue(target());
    tree([row("root", null), row("a", "root"), row("b", "a")]);

    const result = await archiveTask({ taskId: "root", userId: USER });

    expect(result.success).toBe(true);
    const events = emitted();
    expect(events).toHaveLength(3);
    expect(events.every((e) => e.eventType === "ARCHIVED")).toBe(true);

    const byTask = Object.fromEntries(events.map((e) => [e.taskId, e]));
    expect(byTask.root.payload).not.toHaveProperty("causedBy");
    expect(byTask.a.payload).toMatchObject({ causedBy: "root" });
    expect(byTask.b.payload).toMatchObject({ causedBy: "root" });
  });

  it("emits nothing for a subtree pruned by the stop rule", async () => {
    // root -> a(archived) -> b : a already archived, so a and b are pruned.
    db.task.findUnique.mockResolvedValue(target());
    tree([
      row("root", null),
      row("a", "root", { archivedAt: new Date("2026-01-02") }),
      row("b", "a"),
    ]);

    const result = await archiveTask({ taskId: "root", userId: USER });

    expect(result.success).toBe(true);
    expect(emitted().map((e) => e.taskId)).toEqual(["root"]);
  });
});

describe("deleteTask — event emission", () => {
  it("emits DELETED on a leaf target with no causedBy", async () => {
    db.task.findUnique.mockResolvedValue(target());
    tree([row("root", null)]);

    const result = await deleteTask({ taskId: "root", userId: USER });

    expect(result.success).toBe(true);
    const events = emitted();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      taskId: "root",
      userId: USER,
      eventType: "DELETED",
      payload: { at: expect.any(String) },
    });
    expect(events[0].payload).not.toHaveProperty("causedBy");
  });

  it("cascades DELETED to descendants; direct target has no causedBy", async () => {
    // root -> a -> b, none deleted
    db.task.findUnique.mockResolvedValue(target());
    tree([row("root", null), row("a", "root"), row("b", "a")]);

    const result = await deleteTask({ taskId: "root", userId: USER });

    expect(result.success).toBe(true);
    const events = emitted();
    expect(events).toHaveLength(3);
    expect(events.every((e) => e.eventType === "DELETED")).toBe(true);

    const byTask = Object.fromEntries(events.map((e) => [e.taskId, e]));
    expect(byTask.root.payload).not.toHaveProperty("causedBy");
    expect(byTask.a.payload).toMatchObject({ causedBy: "root" });
    expect(byTask.b.payload).toMatchObject({ causedBy: "root" });
  });

  it("emits nothing for a subtree pruned by the stop rule", async () => {
    // root -> a(deleted) -> b : a already deleted, so a and b are pruned.
    db.task.findUnique.mockResolvedValue(target());
    tree([
      row("root", null),
      row("a", "root", { deletedAt: new Date("2026-01-02") }),
      row("b", "a"),
    ]);

    const result = await deleteTask({ taskId: "root", userId: USER });

    expect(result.success).toBe(true);
    expect(emitted().map((e) => e.taskId)).toEqual(["root"]);
  });
});

describe("uncompleteTask — event emission (upward repair)", () => {
  it("emits UNCOMPLETED on the target and each repaired ancestor (causedBy = target)", async () => {
    // root(completed) -> a(completed) -> leaf(completed); uncomplete the leaf.
    const done = new Date("2026-01-02");
    db.task.findUnique.mockResolvedValue(
      target({ id: "leaf", parentId: "a", completedAt: done }),
    );
    ancestors([
      row("a", "root", { completedAt: done }),
      row("root", null, { completedAt: done }),
    ]);

    const result = await uncompleteTask({ taskId: "leaf", userId: USER });

    expect(result.success).toBe(true);
    const events = emitted();
    expect(events.map((e) => e.taskId).sort()).toEqual(["a", "leaf", "root"]);
    expect(events.every((e) => e.eventType === "UNCOMPLETED")).toBe(true);

    const byTask = Object.fromEntries(events.map((e) => [e.taskId, e]));
    expect(byTask.leaf.payload).not.toHaveProperty("causedBy");
    expect(byTask.a.payload).toMatchObject({ causedBy: "leaf" });
    expect(byTask.root.payload).toMatchObject({ causedBy: "leaf" });
  });

  it("stops the upward repair at the first uncompleted ancestor", async () => {
    // root(uncompleted) -> a(completed) -> leaf(completed); repair stops below root.
    const done = new Date("2026-01-02");
    db.task.findUnique.mockResolvedValue(
      target({ id: "leaf", parentId: "a", completedAt: done }),
    );
    ancestors([
      row("a", "root", { completedAt: done }),
      row("root", null), // not completed → not repaired, no event
    ]);

    const result = await uncompleteTask({ taskId: "leaf", userId: USER });

    expect(result.success).toBe(true);
    expect(emitted().map((e) => e.taskId).sort()).toEqual(["a", "leaf"]);
  });
});

describe("unarchiveTask — event emission (upward repair)", () => {
  it("emits UNARCHIVED on the target and each repaired ancestor (causedBy = target)", async () => {
    // root(archived) -> a(archived) -> leaf(archived); unarchive the leaf.
    const at = new Date("2026-01-02");
    db.task.findUnique.mockResolvedValue(
      target({ id: "leaf", parentId: "a", archivedAt: at }),
    );
    ancestors([
      row("a", "root", { archivedAt: at }),
      row("root", null, { archivedAt: at }),
    ]);

    const result = await unarchiveTask({ taskId: "leaf", userId: USER });

    expect(result.success).toBe(true);
    const events = emitted();
    expect(events.map((e) => e.taskId).sort()).toEqual(["a", "leaf", "root"]);
    expect(events.every((e) => e.eventType === "UNARCHIVED")).toBe(true);

    const byTask = Object.fromEntries(events.map((e) => [e.taskId, e]));
    expect(byTask.leaf.payload).not.toHaveProperty("causedBy");
    expect(byTask.a.payload).toMatchObject({ causedBy: "leaf" });
    expect(byTask.root.payload).toMatchObject({ causedBy: "leaf" });
  });

  it("stops the upward repair at the first unarchived ancestor", async () => {
    // root(not archived) -> a(archived) -> leaf(archived); repair stops below root.
    const at = new Date("2026-01-02");
    db.task.findUnique.mockResolvedValue(
      target({ id: "leaf", parentId: "a", archivedAt: at }),
    );
    ancestors([
      row("a", "root", { archivedAt: at }),
      row("root", null), // not archived → not repaired, no event
    ]);

    const result = await unarchiveTask({ taskId: "leaf", userId: USER });

    expect(result.success).toBe(true);
    expect(emitted().map((e) => e.taskId).sort()).toEqual(["a", "leaf"]);
  });
});

describe("hierarchy transition — rollback on emit failure", () => {
  it("propagates an emit failure out of the transaction (no swallowed success)", async () => {
    // The emit rides the caller's tx, so a failing insert must abort the whole
    // operation — the wiring that lets Prisma roll the state change back. (The
    // actual atomic DB revert is Prisma's and is exercised end-to-end in verify.)
    db.task.findUnique.mockResolvedValue(target());
    tree([row("root", null), row("a", "root")]);
    mockTx.taskEvent.create.mockRejectedValue(new Error("event insert failed"));

    const result = await completeTask({ taskId: "root", userId: USER });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("INTERNAL_SERVER_ERROR");
    }
  });
});

describe("restoreDeletedTask — event emission (upward repair)", () => {
  it("emits RESTORED on the target and each repaired ancestor (causedBy = target)", async () => {
    // root(deleted) -> a(deleted) -> leaf(deleted); restore the leaf.
    const at = new Date("2026-01-02");
    db.task.findUnique.mockResolvedValue(
      target({ id: "leaf", parentId: "a", deletedAt: at }),
    );
    ancestors([
      row("a", "root", { deletedAt: at }),
      row("root", null, { deletedAt: at }),
    ]);

    const result = await restoreDeletedTask({ taskId: "leaf", userId: USER });

    expect(result.success).toBe(true);
    const events = emitted();
    expect(events.map((e) => e.taskId).sort()).toEqual(["a", "leaf", "root"]);
    expect(events.every((e) => e.eventType === "RESTORED")).toBe(true);

    const byTask = Object.fromEntries(events.map((e) => [e.taskId, e]));
    expect(byTask.leaf.payload).not.toHaveProperty("causedBy");
    expect(byTask.a.payload).toMatchObject({ causedBy: "leaf" });
    expect(byTask.root.payload).toMatchObject({ causedBy: "leaf" });
  });

  it("stops the upward repair at the first non-deleted ancestor", async () => {
    // root(not deleted) -> a(deleted) -> leaf(deleted); repair stops below root.
    const at = new Date("2026-01-02");
    db.task.findUnique.mockResolvedValue(
      target({ id: "leaf", parentId: "a", deletedAt: at }),
    );
    ancestors([
      row("a", "root", { deletedAt: at }),
      row("root", null), // not deleted → not repaired, no event
    ]);

    const result = await restoreDeletedTask({ taskId: "leaf", userId: USER });

    expect(result.success).toBe(true);
    expect(emitted().map((e) => e.taskId).sort()).toEqual(["a", "leaf"]);
  });
});
