import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockPrismaClient,
  type MockPrismaClient,
} from "@/tests/helpers/prisma-mock";
import { buildActiveTimer } from "@/tests/helpers/factories";

vi.mock("@/lib/prisma", () => {
  const mock = createMockPrismaClient();
  return { default: mock };
});

import { getActiveTimeEntryForUser } from "@/lib/services/activeTask.service";
import prisma from "@/lib/prisma";

const db = prisma as unknown as MockPrismaClient;

describe("getActiveTimeEntryForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the active timer when one exists", async () => {
    const timer = buildActiveTimer();
    db.activeTimer.findUnique.mockResolvedValue(timer);

    const result = await getActiveTimeEntryForUser({ userId: "test-user-1" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(timer);
    }
  });

  it("returns null data when no active timer exists", async () => {
    db.activeTimer.findUnique.mockResolvedValue(null);

    const result = await getActiveTimeEntryForUser({ userId: "test-user-1" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it("queries by userId", async () => {
    db.activeTimer.findUnique.mockResolvedValue(null);

    await getActiveTimeEntryForUser({ userId: "specific-user" });

    expect(db.activeTimer.findUnique).toHaveBeenCalledWith({
      where: { userId: "specific-user" },
    });
  });
});
