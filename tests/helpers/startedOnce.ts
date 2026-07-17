import { describe, it, expect, beforeEach, vi } from "vitest";
import { TaskEventType } from "@prisma/client";
import type { MockTx } from "./prisma-mock";

/**
 * The wiring contract every service action that records first work must keep:
 * emit STARTED once, guard on this task's own STARTED, and fail the action if
 * the emit throws (#23/#55).
 *
 * Both the timer and the manual-entry path wire the same `emitStartedOnce`, so
 * they owe the same four promises. Written once here; each caller supplies only
 * what differs — how the action is invoked and what start time it should store.
 *
 * The prisma mock is module-scoped per test file, so `tx` comes in as an
 * argument rather than being imported.
 */
export function describeStartedOnceWiring({
  name,
  tx,
  setup,
  act,
  actWhenAlreadyStarted = act,
  alreadyStartedCase = "does not emit a second STARTED when the task already has one",
  expectedStartedAt,
  taskId = "test-task-1",
  userId = "test-user-1",
}: {
  /** describe() title, e.g. "startActiveTimer — STARTED event" */
  name: string;
  tx: MockTx;
  /** Mocks the action needs beyond the STARTED guard; runs after clearAllMocks. */
  setup: () => void;
  act: () => Promise<{ success: boolean }>;
  /**
   * Override for the already-started case only — lets the manual-entry path
   * assert the backdated variant, where the distinction actually bites.
   */
  actWhenAlreadyStarted?: () => Promise<{ success: boolean }>;
  /** it() title for the already-started case, when the default understates it. */
  alreadyStartedCase?: string;
  /** The stored value: an exact ISO string, or expect.any(String) for a "now". */
  expectedStartedAt: unknown;
  taskId?: string;
  userId?: string;
}) {
  describe(name, () => {
    beforeEach(() => {
      vi.clearAllMocks();
      setup();
    });

    it("emits STARTED with the start time on the task's first work", async () => {
      tx.taskEvent.findFirst.mockResolvedValue(null); // no prior STARTED

      await act();

      expect(tx.taskEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            taskId,
            userId,
            eventType: TaskEventType.STARTED,
            // stored as an ISO-8601 string by emitEvent's timestamp transform
            payload: { startedAt: expectedStartedAt },
          }),
        }),
      );
    });

    it(alreadyStartedCase, async () => {
      tx.taskEvent.findFirst.mockResolvedValue({ id: "existing-started" });

      await actWhenAlreadyStarted();

      expect(tx.taskEvent.create).not.toHaveBeenCalled();
    });

    it("scopes the prior-STARTED guard to this task and event type", async () => {
      tx.taskEvent.findFirst.mockResolvedValue(null);

      await act();

      expect(tx.taskEvent.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            taskId,
            eventType: TaskEventType.STARTED,
          }),
        }),
      );
    });

    it("fails the action (rolls back) when the STARTED emit throws", async () => {
      tx.taskEvent.findFirst.mockResolvedValue(null);
      tx.taskEvent.create.mockRejectedValue(new Error("emit failed"));

      const result = await act();

      expect(result.success).toBe(false);
    });
  });
}
