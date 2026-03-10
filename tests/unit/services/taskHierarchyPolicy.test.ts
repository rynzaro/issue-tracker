import { describe, it, expect } from "vitest";
import {
  validateTransition,
  buildTransitionPlan,
  type LineageNode,
} from "@/lib/services/taskHierarchyPolicy";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const now = new Date("2026-03-10T12:00:00Z");

function node(
  id: string,
  parentId: string | null,
  overrides: Partial<LineageNode> = {},
): LineageNode {
  return {
    id,
    parentId,
    completedAt: null,
    archivedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

// ─── validateTransition: COMPLETE ──────────────────────────────────────────────

describe("validateTransition — COMPLETE", () => {
  it("valid when no ancestors", () => {
    const task = node("t1", null);
    expect(validateTransition("COMPLETE", task, [])).toEqual({ valid: true });
  });

  it("valid when ancestors are active and uncompleted", () => {
    const task = node("t3", "t2");
    const ancestors = [node("t2", "t1"), node("t1", null)];
    expect(validateTransition("COMPLETE", task, ancestors)).toEqual({
      valid: true,
    });
  });

  it("fails when an ancestor is deleted", () => {
    const task = node("t2", "t1");
    const ancestors = [node("t1", null, { deletedAt: now })];
    const result = validateTransition("COMPLETE", task, ancestors);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.code).toBe("UNEXPECTED_ERROR");
  });

  it("fails when an ancestor is archived", () => {
    const task = node("t2", "t1");
    const ancestors = [node("t1", null, { archivedAt: now })];
    const result = validateTransition("COMPLETE", task, ancestors);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.code).toBe("UNEXPECTED_ERROR");
  });

  it("fails when there is a completion gap in ancestors", () => {
    const task = node("t3", "t2");
    // t2 uncompleted, t1 completed = gap
    const ancestors = [
      node("t2", "t1"),
      node("t1", null, { completedAt: now }),
    ];
    const result = validateTransition("COMPLETE", task, ancestors);
    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.error.message).toBe("Invalid ancestor completion chain");
  });

  it("valid when ancestors are contiguously completed from parent up", () => {
    const task = node("t3", "t2");
    const ancestors = [
      node("t2", "t1", { completedAt: now }),
      node("t1", null, { completedAt: now }),
    ];
    expect(validateTransition("COMPLETE", task, ancestors)).toEqual({
      valid: true,
    });
  });
});

// ─── validateTransition: UNCOMPLETE ────────────────────────────────────────────

describe("validateTransition — UNCOMPLETE", () => {
  it("valid when no ancestors", () => {
    const task = node("t1", null, { completedAt: now });
    expect(validateTransition("UNCOMPLETE", task, [])).toEqual({ valid: true });
  });

  it("valid when contiguous completed ancestors then uncompleted", () => {
    const task = node("t3", "t2", { completedAt: now });
    const ancestors = [
      node("t2", "t1", { completedAt: now }),
      node("t1", null), // uncompleted root
    ];
    expect(validateTransition("UNCOMPLETE", task, ancestors)).toEqual({
      valid: true,
    });
  });

  it("fails when there is a completion gap", () => {
    const task = node("t3", "t2", { completedAt: now });
    // t2 uncompleted, t1 completed = gap
    const ancestors = [
      node("t2", "t1"),
      node("t1", null, { completedAt: now }),
    ];
    const result = validateTransition("UNCOMPLETE", task, ancestors);
    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.error.message).toBe("Invalid ancestor completion chain");
  });

  it("fails when an ancestor is deleted", () => {
    const task = node("t2", "t1", { completedAt: now });
    const ancestors = [node("t1", null, { deletedAt: now })];
    const result = validateTransition("UNCOMPLETE", task, ancestors);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.code).toBe("UNEXPECTED_ERROR");
  });

  it("fails when an ancestor is archived", () => {
    const task = node("t2", "t1", { completedAt: now });
    const ancestors = [node("t1", null, { archivedAt: now })];
    const result = validateTransition("UNCOMPLETE", task, ancestors);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.code).toBe("UNEXPECTED_ERROR");
  });
});

// ─── validateTransition: ARCHIVE ───────────────────────────────────────────────

describe("validateTransition — ARCHIVE", () => {
  it("valid when no ancestors", () => {
    const task = node("t1", null);
    expect(validateTransition("ARCHIVE", task, [])).toEqual({ valid: true });
  });

  it("valid when ancestors are completed but not deleted", () => {
    const task = node("t2", "t1");
    const ancestors = [node("t1", null, { completedAt: now })];
    expect(validateTransition("ARCHIVE", task, ancestors)).toEqual({
      valid: true,
    });
  });

  it("fails when an ancestor is archived", () => {
    const task = node("t2", "t1");
    const ancestors = [node("t1", null, { archivedAt: now })];
    const result = validateTransition("ARCHIVE", task, ancestors);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.code).toBe("UNEXPECTED_ERROR");
  });

  it("fails when an ancestor is deleted", () => {
    const task = node("t2", "t1");
    const ancestors = [node("t1", null, { deletedAt: now })];
    const result = validateTransition("ARCHIVE", task, ancestors);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.code).toBe("UNEXPECTED_ERROR");
  });
});

// ─── validateTransition: UNARCHIVE ─────────────────────────────────────────────

describe("validateTransition — UNARCHIVE", () => {
  it("valid when no ancestors", () => {
    const task = node("t1", null, { archivedAt: now });
    expect(validateTransition("UNARCHIVE", task, [])).toEqual({ valid: true });
  });

  it("valid when contiguous archived ancestors then unarchived", () => {
    const task = node("t3", "t2", { archivedAt: now });
    const ancestors = [
      node("t2", "t1", { archivedAt: now }),
      node("t1", null), // unarchived root
    ];
    expect(validateTransition("UNARCHIVE", task, ancestors)).toEqual({
      valid: true,
    });
  });

  it("fails when there is an archive gap", () => {
    const task = node("t3", "t2", { archivedAt: now });
    // t2 unarchived, t1 archived = gap
    const ancestors = [node("t2", "t1"), node("t1", null, { archivedAt: now })];
    const result = validateTransition("UNARCHIVE", task, ancestors);
    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.error.message).toBe("Invalid ancestor archive chain");
  });

  it("fails when an ancestor is deleted", () => {
    const task = node("t2", "t1", { archivedAt: now });
    const ancestors = [node("t1", null, { deletedAt: now })];
    const result = validateTransition("UNARCHIVE", task, ancestors);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.code).toBe("UNEXPECTED_ERROR");
  });
});

// ─── validateTransition: DELETE ────────────────────────────────────────────────

describe("validateTransition — DELETE", () => {
  it("valid when no ancestors", () => {
    const task = node("t1", null);
    expect(validateTransition("DELETE", task, [])).toEqual({ valid: true });
  });

  it("valid when ancestors are archived but not deleted", () => {
    const task = node("t2", "t1");
    const ancestors = [node("t1", null, { archivedAt: now })];
    expect(validateTransition("DELETE", task, ancestors)).toEqual({
      valid: true,
    });
  });

  it("fails when an ancestor is deleted", () => {
    const task = node("t2", "t1");
    const ancestors = [node("t1", null, { deletedAt: now })];
    const result = validateTransition("DELETE", task, ancestors);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.code).toBe("UNEXPECTED_ERROR");
  });
});

// ─── validateTransition: UNDELETE ──────────────────────────────────────────────

describe("validateTransition — UNDELETE", () => {
  it("valid when no ancestors", () => {
    const task = node("t1", null, { deletedAt: now });
    expect(validateTransition("UNDELETE", task, [])).toEqual({ valid: true });
  });

  it("valid when contiguous deleted ancestors then undeleted", () => {
    const task = node("t3", "t2", { deletedAt: now });
    const ancestors = [
      node("t2", "t1", { deletedAt: now }),
      node("t1", null), // undeleted root
    ];
    expect(validateTransition("UNDELETE", task, ancestors)).toEqual({
      valid: true,
    });
  });

  it("fails when there is a deletion gap", () => {
    const task = node("t3", "t2", { deletedAt: now });
    // t2 undeleted, t1 deleted = gap
    const ancestors = [node("t2", "t1"), node("t1", null, { deletedAt: now })];
    const result = validateTransition("UNDELETE", task, ancestors);
    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.error.message).toBe("Invalid ancestor deletion chain");
  });

  it("valid when all ancestors are deleted (full chain)", () => {
    const task = node("t3", "t2", { deletedAt: now });
    const ancestors = [
      node("t2", "t1", { deletedAt: now }),
      node("t1", null, { deletedAt: now }),
    ];
    expect(validateTransition("UNDELETE", task, ancestors)).toEqual({
      valid: true,
    });
  });
});

// ─── buildTransitionPlan: COMPLETE ─────────────────────────────────────────────

describe("buildTransitionPlan — COMPLETE", () => {
  it("completes all descendants", () => {
    const task = node("t1", null);
    const plan = buildTransitionPlan("COMPLETE", task, [], ["t1", "t2", "t3"]);
    expect(plan.setCompletedAt.ids).toEqual(["t1", "t2", "t3"]);
    expect(plan.setCompletedAt.value).toBeInstanceOf(Date);
    expect(plan.setArchivedAt.ids).toEqual([]);
    expect(plan.setDeletedAt.ids).toEqual([]);
  });
});

// ─── buildTransitionPlan: UNCOMPLETE ───────────────────────────────────────────

describe("buildTransitionPlan — UNCOMPLETE", () => {
  it("uncompletes task and contiguous completed ancestors", () => {
    const task = node("t3", "t2", { completedAt: now });
    const ancestors = [
      node("t2", "t1", { completedAt: now }),
      node("t1", null), // uncompleted
    ];
    const plan = buildTransitionPlan("UNCOMPLETE", task, ancestors);
    expect(plan.setCompletedAt.ids).toEqual(["t3", "t2"]);
    expect(plan.setCompletedAt.value).toBeNull();
  });

  it("stops at first uncompleted ancestor", () => {
    const task = node("t4", "t3", { completedAt: now });
    const ancestors = [
      node("t3", "t2", { completedAt: now }),
      node("t2", "t1"), // uncompleted — stop here
      node("t1", null, { completedAt: now }), // should NOT be included (gap already validated)
    ];
    const plan = buildTransitionPlan("UNCOMPLETE", task, ancestors);
    expect(plan.setCompletedAt.ids).toEqual(["t4", "t3"]);
  });

  it("returns empty ids when task and ancestors are already uncompleted", () => {
    const task = node("t2", "t1");
    const ancestors = [node("t1", null)];
    const plan = buildTransitionPlan("UNCOMPLETE", task, ancestors);
    expect(plan.setCompletedAt.ids).toEqual([]);
  });
});

// ─── buildTransitionPlan: ARCHIVE ──────────────────────────────────────────────

describe("buildTransitionPlan — ARCHIVE", () => {
  it("archives all descendants", () => {
    const task = node("t1", null);
    const plan = buildTransitionPlan("ARCHIVE", task, [], ["t1", "t2"]);
    expect(plan.setArchivedAt.ids).toEqual(["t1", "t2"]);
    expect(plan.setArchivedAt.value).toBeInstanceOf(Date);
  });
});

// ─── buildTransitionPlan: UNARCHIVE ────────────────────────────────────────────

describe("buildTransitionPlan — UNARCHIVE", () => {
  it("unarchives task and contiguous archived ancestors", () => {
    const task = node("t3", "t2", { archivedAt: now });
    const ancestors = [
      node("t2", "t1", { archivedAt: now }),
      node("t1", null), // unarchived — stop
    ];
    const plan = buildTransitionPlan("UNARCHIVE", task, ancestors);
    expect(plan.setArchivedAt.ids).toEqual(["t3", "t2"]);
    expect(plan.setArchivedAt.value).toBeNull();
  });

  it("stops at first unarchived ancestor", () => {
    const task = node("t3", "t2", { archivedAt: now });
    const ancestors = [
      node("t2", "t1"), // unarchived — stop
      node("t1", null, { archivedAt: now }), // should NOT be included
    ];
    const plan = buildTransitionPlan("UNARCHIVE", task, ancestors);
    expect(plan.setArchivedAt.ids).toEqual(["t3"]);
  });

  it("returns empty ids when task and ancestors are already unarchived", () => {
    const task = node("t2", "t1");
    const ancestors = [node("t1", null)];
    const plan = buildTransitionPlan("UNARCHIVE", task, ancestors);
    expect(plan.setArchivedAt.ids).toEqual([]);
  });
});

// ─── buildTransitionPlan: DELETE ───────────────────────────────────────────────

describe("buildTransitionPlan — DELETE", () => {
  it("deletes all descendants", () => {
    const task = node("t1", null);
    const plan = buildTransitionPlan("DELETE", task, [], ["t1", "t2", "t3"]);
    expect(plan.setDeletedAt.ids).toEqual(["t1", "t2", "t3"]);
    expect(plan.setDeletedAt.value).toBeInstanceOf(Date);
  });
});

// ─── buildTransitionPlan: UNDELETE ─────────────────────────────────────────────

describe("buildTransitionPlan — UNDELETE", () => {
  it("undeletes task and contiguous deleted ancestors", () => {
    const task = node("t3", "t2", { deletedAt: now });
    const ancestors = [
      node("t2", "t1", { deletedAt: now }),
      node("t1", null), // not deleted — stop
    ];
    const plan = buildTransitionPlan("UNDELETE", task, ancestors);
    expect(plan.setDeletedAt.ids).toEqual(["t3", "t2"]);
    expect(plan.setDeletedAt.value).toBeNull();
  });

  it("stops at first non-deleted ancestor", () => {
    const task = node("t3", "t2", { deletedAt: now });
    const ancestors = [
      node("t2", "t1"), // not deleted — stop
      node("t1", null, { deletedAt: now }), // should NOT be included
    ];
    const plan = buildTransitionPlan("UNDELETE", task, ancestors);
    expect(plan.setDeletedAt.ids).toEqual(["t3"]);
  });

  it("does not touch archivedAt", () => {
    const task = node("t2", "t1", { deletedAt: now, archivedAt: now });
    const ancestors = [node("t1", null, { deletedAt: now, archivedAt: now })];
    const plan = buildTransitionPlan("UNDELETE", task, ancestors);
    expect(plan.setDeletedAt.ids).toEqual(["t2", "t1"]);
    expect(plan.setArchivedAt.ids).toEqual([]);
  });
});
