import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma, TaskEventType } from "@prisma/client";
import { mockTx, type MockTx } from "@/tests/helpers/prisma-mock";
import { emitEvent, type EmitEventInput } from "@/lib/services/event.service";

const tx = mockTx as MockTx;
const txClient = mockTx as unknown as Prisma.TransactionClient;

// Emit with the payload types bypassed, to exercise runtime validation against
// data an untyped boundary might hand us.
const emitAny = (input: {
  taskId: string;
  userId: string;
  type: TaskEventType;
  payload: unknown;
}) => emitEvent(txClient, input as unknown as EmitEventInput);

describe("emitEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tx.taskEvent.create.mockResolvedValue({ id: "event-1" });
  });

  describe("valid payloads insert through the transaction client", () => {
    it("inserts a TaskEvent through the given transaction client for a valid payload", async () => {
      await emitEvent(txClient, {
        taskId: "task-1",
        userId: "user-1",
        type: TaskEventType.CREATED,
        payload: { title: "Write the docs", estimate: 90 },
      });

      expect(tx.taskEvent.create).toHaveBeenCalledWith({
        data: {
          taskId: "task-1",
          userId: "user-1",
          eventType: TaskEventType.CREATED,
          payload: { title: "Write the docs", estimate: 90 },
        },
      });
    });

    it("inserts CREATED with neither estimate nor parentId", async () => {
      await emitEvent(txClient, {
        taskId: "task-1",
        userId: "user-1",
        type: TaskEventType.CREATED,
        payload: { title: "Solo task" },
      });

      expect(tx.taskEvent.create).toHaveBeenCalledWith({
        data: {
          taskId: "task-1",
          userId: "user-1",
          eventType: TaskEventType.CREATED,
          payload: { title: "Solo task" },
        },
      });
    });

    it("inserts STARTED, storing startedAt as an ISO-8601 string", async () => {
      const startedAt = new Date("2026-07-14T09:00:00Z");
      await emitEvent(txClient, {
        taskId: "task-1",
        userId: "user-1",
        type: TaskEventType.STARTED,
        payload: { startedAt },
      });

      expect(tx.taskEvent.create).toHaveBeenCalledWith({
        data: {
          taskId: "task-1",
          userId: "user-1",
          eventType: TaskEventType.STARTED,
          payload: { startedAt: "2026-07-14T09:00:00.000Z" },
        },
      });
    });

    it("inserts a direct hierarchy transition without causedBy", async () => {
      const at = new Date("2026-07-14T12:00:00Z");
      await emitEvent(txClient, {
        taskId: "task-1",
        userId: "user-1",
        type: TaskEventType.COMPLETED,
        payload: { at },
      });

      expect(tx.taskEvent.create).toHaveBeenCalledWith({
        data: {
          taskId: "task-1",
          userId: "user-1",
          eventType: TaskEventType.COMPLETED,
          payload: { at: "2026-07-14T12:00:00.000Z" },
        },
      });
    });

    it("inserts a cascaded hierarchy transition carrying causedBy (ADR-0020)", async () => {
      const at = new Date("2026-07-14T12:00:00Z");
      await emitEvent(txClient, {
        taskId: "child-1",
        userId: "user-1",
        type: TaskEventType.ARCHIVED,
        payload: { at, causedBy: "parent-1" },
      });

      expect(tx.taskEvent.create).toHaveBeenCalledWith({
        data: {
          taskId: "child-1",
          userId: "user-1",
          eventType: TaskEventType.ARCHIVED,
          payload: { at: "2026-07-14T12:00:00.000Z", causedBy: "parent-1" },
        },
      });
    });

    it("accepts ESTIMATE_CHANGED with nulls for set and clear", async () => {
      await emitEvent(txClient, {
        taskId: "task-1",
        userId: "user-1",
        type: TaskEventType.ESTIMATE_CHANGED,
        payload: { old: null, new: 45 }, // set from nothing
      });
      await emitEvent(txClient, {
        taskId: "task-1",
        userId: "user-1",
        type: TaskEventType.ESTIMATE_CHANGED,
        payload: { old: 45, new: null }, // clear
      });

      expect(tx.taskEvent.create).toHaveBeenCalledTimes(2);
    });

    it("inserts SUBTASK_CREATED with the child reference", async () => {
      await emitEvent(txClient, {
        taskId: "parent-1",
        userId: "user-1",
        type: TaskEventType.SUBTASK_CREATED,
        payload: { childTaskId: "child-1", childTitle: "Subtask" },
      });

      expect(tx.taskEvent.create).toHaveBeenCalledWith({
        data: {
          taskId: "parent-1",
          userId: "user-1",
          eventType: TaskEventType.SUBTASK_CREATED,
          payload: { childTaskId: "child-1", childTitle: "Subtask" },
        },
      });
    });

    it("inserts TAGS_CHANGED with before/after tag id sets", async () => {
      await emitEvent(txClient, {
        taskId: "task-1",
        userId: "user-1",
        type: TaskEventType.TAGS_CHANGED,
        payload: { old: [1, 2], new: [2, 3] },
      });

      expect(tx.taskEvent.create).toHaveBeenCalledWith({
        data: {
          taskId: "task-1",
          userId: "user-1",
          eventType: TaskEventType.TAGS_CHANGED,
          payload: { old: [1, 2], new: [2, 3] },
        },
      });
    });

    it("accepts a permissive payload for provisional (dormant) event types", async () => {
      await emitEvent(txClient, {
        taskId: "task-1",
        userId: "user-1",
        type: TaskEventType.TODO_ADDED,
        payload: { todoItemId: 7, title: "later" },
      });

      expect(tx.taskEvent.create).toHaveBeenCalledWith({
        data: {
          taskId: "task-1",
          userId: "user-1",
          eventType: TaskEventType.TODO_ADDED,
          payload: { todoItemId: 7, title: "later" },
        },
      });
    });

    it("stores only the validated fields, stripping unknown keys", async () => {
      await emitAny({
        taskId: "task-1",
        userId: "user-1",
        type: TaskEventType.CREATED,
        payload: { title: "Kept", bogus: "dropped" },
      });

      expect(tx.taskEvent.create).toHaveBeenCalledWith({
        data: {
          taskId: "task-1",
          userId: "user-1",
          eventType: TaskEventType.CREATED,
          payload: { title: "Kept" },
        },
      });
    });

    it("returns the created event row", async () => {
      const row = { id: "event-42" };
      tx.taskEvent.create.mockResolvedValue(row);

      const result = await emitEvent(txClient, {
        taskId: "task-1",
        userId: "user-1",
        type: TaskEventType.CREATED,
        payload: { title: "Anything" },
      });

      expect(result).toBe(row);
    });
  });

  describe("invalid payloads throw and insert nothing", () => {
    it("throws when a required field is missing", async () => {
      await expect(
        emitAny({
          taskId: "task-1",
          userId: "user-1",
          type: TaskEventType.CREATED,
          payload: { estimate: 60 }, // no title
        }),
      ).rejects.toThrow();

      expect(tx.taskEvent.create).not.toHaveBeenCalled();
    });

    it("throws when a field has the wrong type", async () => {
      await expect(
        emitAny({
          taskId: "task-1",
          userId: "user-1",
          type: TaskEventType.ESTIMATE_CHANGED,
          payload: { old: "60", new: 90 }, // old should be number | null
        }),
      ).rejects.toThrow();

      expect(tx.taskEvent.create).not.toHaveBeenCalled();
    });

    it("throws when the payload shape does not match the event type", async () => {
      await expect(
        emitAny({
          taskId: "task-1",
          userId: "user-1",
          type: TaskEventType.COMPLETED, // expects { at, causedBy? }
          payload: { childTaskId: "c1", childTitle: "x" },
        }),
      ).rejects.toThrow();

      expect(tx.taskEvent.create).not.toHaveBeenCalled();
    });
  });

  describe("emission rides the caller's transaction", () => {
    it("routes the insert through the passed tx, so a later caller failure rolls the event back", async () => {
      // A caller that emits an event and then fails: on the real DB the shared
      // transaction rolls back, taking the event insert with it. Here we assert the
      // insert was issued on the caller-supplied tx client (not a module-level one).
      const callerMutation = async (client: Prisma.TransactionClient) => {
        await emitEvent(client, {
          taskId: "task-1",
          userId: "user-1",
          type: TaskEventType.STARTED,
          payload: { startedAt: new Date("2026-07-14T10:00:00Z") },
        });
        throw new Error("caller failed after emit");
      };

      await expect(callerMutation(txClient)).rejects.toThrow(
        "caller failed after emit",
      );

      expect(tx.taskEvent.create).toHaveBeenCalledTimes(1);
      expect(tx.taskEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            taskId: "task-1",
            eventType: TaskEventType.STARTED,
          }),
        }),
      );
    });
  });
});
