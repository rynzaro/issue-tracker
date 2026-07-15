import { describe, it, expect } from "vitest";
import {
  validateTransition,
  buildTransitionPlan,
  type LineageNode,
  type TransitionPlan,
  type TransitionState,
} from "@/lib/domain/taskHierarchyPolicy";

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

/** Every id the plan writes for one state, in plan order. */
function ids(plan: TransitionPlan, state: TransitionState): string[] {
  return plan.writes.filter((w) => w.state === state).flatMap((w) => w.ids);
}

/** The states the plan touches, in order — asserts nothing else is written. */
function states(plan: TransitionPlan): TransitionState[] {
  return plan.writes.map((w) => w.state);
}

/** The value the plan stores for one state; undefined when it does not write it. */
function value(
  plan: TransitionPlan,
  state: TransitionState,
): Date | null | undefined {
  return plan.writes.find((w) => w.state === state)?.value;
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

  it("fails when the task itself is archived", () => {
    const task = node("t1", null, { archivedAt: now });
    const result = validateTransition("COMPLETE", task, []);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.message).toBe("Task is archived");
  });

  it("fails when the task itself is already completed", () => {
    const task = node("t1", null, { completedAt: now });
    const result = validateTransition("COMPLETE", task, []);
    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.error.message).toBe("Task is already completed");
  });

  it("fails when the task itself is deleted", () => {
    const task = node("t1", null, { deletedAt: now });
    const result = validateTransition("COMPLETE", task, []);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.message).toBe("Task is deleted");
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

  it("fails when the task itself is archived", () => {
    const task = node("t1", null, { completedAt: now, archivedAt: now });
    const result = validateTransition("UNCOMPLETE", task, []);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.message).toBe("Task is archived");
  });

  it("fails when the task itself is not completed", () => {
    const task = node("t1", null);
    const result = validateTransition("UNCOMPLETE", task, []);
    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.error.message).toBe("Task is not completed");
  });

  it("fails when the task itself is deleted", () => {
    const task = node("t1", null, { completedAt: now, deletedAt: now });
    const result = validateTransition("UNCOMPLETE", task, []);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.message).toBe("Task is deleted");
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

  it("fails when the task itself is already archived", () => {
    const task = node("t1", null, { archivedAt: now });
    const result = validateTransition("ARCHIVE", task, []);
    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.error.message).toBe("Task is already archived");
  });

  it("fails when the task itself is deleted", () => {
    const task = node("t1", null, { deletedAt: now });
    const result = validateTransition("ARCHIVE", task, []);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.message).toBe("Task is deleted");
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

  it("fails when the task itself is not archived", () => {
    const task = node("t1", null);
    const result = validateTransition("UNARCHIVE", task, []);
    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.error.message).toBe("Task is not archived");
  });

  it("fails when the task itself is deleted", () => {
    const task = node("t1", null, { archivedAt: now, deletedAt: now });
    const result = validateTransition("UNARCHIVE", task, []);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.message).toBe("Task is deleted");
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

  it("fails when the task itself is already deleted", () => {
    const task = node("t1", null, { deletedAt: now });
    const result = validateTransition("DELETE", task, []);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.message).toBe("Task is deleted");
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

  it("fails when the task itself is not deleted", () => {
    const task = node("t1", null);
    const result = validateTransition("UNDELETE", task, []);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error.message).toBe("Task is not deleted");
  });
});

// ─── buildTransitionPlan: COMPLETE ─────────────────────────────────────────────

describe("buildTransitionPlan — COMPLETE", () => {
  it("completes all descendants", () => {
    const task = node("t1", null);
    const descendants = [task, node("t2", "t1"), node("t3", "t2")];
    const plan = buildTransitionPlan("COMPLETE", task, [], descendants);
    expect(ids(plan, "completedAt")).toEqual(["t1", "t2", "t3"]);
    expect(value(plan, "completedAt")).toBeInstanceOf(Date);
    expect(states(plan)).toEqual(["completedAt"]);
  });

  it("stops at an already-completed descendant and keeps its date", () => {
    const task = node("t1", null);
    const descendants = [
      task,
      node("t2", "t1", { completedAt: now }), // finished earlier — keep its date
      node("t3", "t1"),
      node("t4", "t2", { completedAt: now }), // below the stop — not walked
    ];
    const plan = buildTransitionPlan("COMPLETE", task, [], descendants);
    expect(ids(plan, "completedAt")).toEqual(["t1", "t3"]);
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
    expect(ids(plan, "completedAt")).toEqual(["t3", "t2"]);
    expect(value(plan, "completedAt")).toBeNull();
  });

  it("stops at first uncompleted ancestor", () => {
    const task = node("t4", "t3", { completedAt: now });
    const ancestors = [
      node("t3", "t2", { completedAt: now }),
      node("t2", "t1"), // uncompleted — stop here
      node("t1", null, { completedAt: now }), // should NOT be included (gap already validated)
    ];
    const plan = buildTransitionPlan("UNCOMPLETE", task, ancestors);
    expect(ids(plan, "completedAt")).toEqual(["t4", "t3"]);
  });

  it("plans no writes when task and ancestors are already uncompleted", () => {
    const task = node("t2", "t1");
    const ancestors = [node("t1", null)];
    const plan = buildTransitionPlan("UNCOMPLETE", task, ancestors);
    expect(plan.writes).toEqual([]);
  });
});

// ─── buildTransitionPlan: ARCHIVE ──────────────────────────────────────────────

describe("buildTransitionPlan — ARCHIVE", () => {
  it("archives all descendants", () => {
    const task = node("t1", null);
    const descendants = [task, node("t2", "t1")];
    const plan = buildTransitionPlan("ARCHIVE", task, [], descendants);
    expect(ids(plan, "archivedAt")).toEqual(["t1", "t2"]);
    expect(value(plan, "archivedAt")).toBeInstanceOf(Date);
    expect(states(plan)).toEqual(["archivedAt"]);
  });

  it("stops at an already-archived descendant and keeps its date", () => {
    const task = node("t1", null);
    const descendants = [
      task,
      node("t2", "t1", { archivedAt: now }), // archived earlier — keep its date
      node("t3", "t1"),
      node("t4", "t2", { archivedAt: now }), // below the stop — not walked
    ];
    const plan = buildTransitionPlan("ARCHIVE", task, [], descendants);
    expect(ids(plan, "archivedAt")).toEqual(["t1", "t3"]);
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
    expect(ids(plan, "archivedAt")).toEqual(["t3", "t2"]);
    expect(value(plan, "archivedAt")).toBeNull();
  });

  it("stops at first unarchived ancestor", () => {
    const task = node("t3", "t2", { archivedAt: now });
    const ancestors = [
      node("t2", "t1"), // unarchived — stop
      node("t1", null, { archivedAt: now }), // should NOT be included
    ];
    const plan = buildTransitionPlan("UNARCHIVE", task, ancestors);
    expect(ids(plan, "archivedAt")).toEqual(["t3"]);
  });

  it("plans no writes when task and ancestors are already unarchived", () => {
    const task = node("t2", "t1");
    const ancestors = [node("t1", null)];
    const plan = buildTransitionPlan("UNARCHIVE", task, ancestors);
    expect(plan.writes).toEqual([]);
  });
});

// ─── buildTransitionPlan: DELETE ───────────────────────────────────────────────

describe("buildTransitionPlan — DELETE", () => {
  it("deletes all descendants including archived ones", () => {
    const task = node("t1", null);
    const descendants = [
      task,
      node("t2", "t1", { archivedAt: now }), // archived but not deleted — still deleted
      node("t3", "t2"),
    ];
    const plan = buildTransitionPlan("DELETE", task, [], descendants);
    expect(ids(plan, "deletedAt")).toEqual(["t1", "t2", "t3"]);
    expect(value(plan, "deletedAt")).toBeInstanceOf(Date);
    expect(states(plan)).toEqual(["deletedAt"]);
  });

  it("stops at an already-deleted descendant and keeps its date", () => {
    const task = node("t1", null);
    const descendants = [
      task,
      node("t2", "t1", { deletedAt: now }), // deleted earlier — keep its date
      node("t3", "t1"),
      node("t4", "t2", { deletedAt: now }), // below the stop — not walked
    ];
    const plan = buildTransitionPlan("DELETE", task, [], descendants);
    expect(ids(plan, "deletedAt")).toEqual(["t1", "t3"]);
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
    expect(ids(plan, "deletedAt")).toEqual(["t3", "t2"]);
    expect(value(plan, "deletedAt")).toBeNull();
  });

  it("stops at first non-deleted ancestor", () => {
    const task = node("t3", "t2", { deletedAt: now });
    const ancestors = [
      node("t2", "t1"), // not deleted — stop
      node("t1", null, { deletedAt: now }), // should NOT be included
    ];
    const plan = buildTransitionPlan("UNDELETE", task, ancestors);
    expect(ids(plan, "deletedAt")).toEqual(["t3"]);
  });

  it("does not touch archivedAt", () => {
    const task = node("t2", "t1", { deletedAt: now, archivedAt: now });
    const ancestors = [node("t1", null, { deletedAt: now, archivedAt: now })];
    const plan = buildTransitionPlan("UNDELETE", task, ancestors);
    expect(ids(plan, "deletedAt")).toEqual(["t2", "t1"]);
    expect(states(plan)).toEqual(["deletedAt"]);
  });
});

// ─── buildTransitionPlan: the strength order ───────────────────────────────────

// delete > archive > complete (#57). A forward kind cascades through states
// strictly weaker than its own and stops at equal-or-stronger, keeping the
// stronger state's date. The order alone decides — the caller does not get to
// pre-filter the subtree into agreement.
describe("buildTransitionPlan — strength order delete > archive > complete", () => {
  it("COMPLETE stops at an archived descendant and never walks below it", () => {
    const task = node("t1", null);
    const descendants = [
      task,
      node("t2", "t1", { archivedAt: now }), // stronger — stop, keep its date
      node("t3", "t2"), // below the stop — untouched
      node("t4", "t1"), // sibling — still completed
    ];
    const plan = buildTransitionPlan("COMPLETE", task, [], descendants);
    expect(ids(plan, "completedAt")).toEqual(["t1", "t4"]);
  });

  it("COMPLETE stops at a deleted descendant", () => {
    const task = node("t1", null);
    const descendants = [task, node("t2", "t1", { deletedAt: now })];
    const plan = buildTransitionPlan("COMPLETE", task, [], descendants);
    expect(ids(plan, "completedAt")).toEqual(["t1"]);
  });

  it("ARCHIVE stops at a deleted descendant but cascades through a completed one", () => {
    const task = node("t1", null);
    const descendants = [
      task,
      node("t2", "t1", { completedAt: now }), // weaker — archive passes through
      node("t3", "t2"), // still reached, below the completed one
      node("t4", "t1", { deletedAt: now }), // stronger — stop
      node("t5", "t4"), // below the stop — untouched
    ];
    const plan = buildTransitionPlan("ARCHIVE", task, [], descendants);
    expect(ids(plan, "archivedAt")).toEqual(["t1", "t2", "t3"]);
  });

  it("DELETE cascades through both weaker states, stopping only at deleted", () => {
    const task = node("t1", null);
    const descendants = [
      task,
      node("t2", "t1", { completedAt: now }), // weaker — pass through
      node("t3", "t1", { archivedAt: now }), // weaker — pass through
      node("t4", "t3"), // still reached, below the archived one
      node("t5", "t1", { deletedAt: now }), // equal — stop, keep its date
    ];
    const plan = buildTransitionPlan("DELETE", task, [], descendants);
    expect(ids(plan, "deletedAt")).toEqual(["t1", "t2", "t3", "t4"]);
  });
});

// ─── buildTransitionPlan: events ───────────────────────────────────────────────

describe("buildTransitionPlan — events", () => {
  it("plans one event per changed task, target first and without causedBy", () => {
    const task = node("t1", null);
    const descendants = [task, node("t2", "t1"), node("t3", "t2")];
    const plan = buildTransitionPlan("COMPLETE", task, [], descendants);
    expect(plan.events).toEqual([
      { kind: "COMPLETE", taskId: "t1", at: value(plan, "completedAt") },
      {
        kind: "COMPLETE",
        taskId: "t2",
        at: value(plan, "completedAt"),
        causedBy: "t1",
      },
      {
        kind: "COMPLETE",
        taskId: "t3",
        at: value(plan, "completedAt"),
        causedBy: "t1",
      },
    ]);
  });

  it("stamps forward events with the date the plan stores", () => {
    const task = node("t1", null);
    const plan = buildTransitionPlan("ARCHIVE", task, [], [task]);
    expect(plan.events[0].at).toBe(value(plan, "archivedAt"));
  });

  it("stamps backward events with now, since the plan stores null", () => {
    const task = node("t2", "t1", { completedAt: now });
    const ancestors = [node("t1", null, { completedAt: now })];
    const plan = buildTransitionPlan("UNCOMPLETE", task, ancestors);
    expect(value(plan, "completedAt")).toBeNull();
    expect(plan.events.map((e) => e.at)).toEqual([
      expect.any(Date),
      expect.any(Date),
    ]);
    expect(plan.events[0].at.getTime()).toBeGreaterThan(now.getTime());
  });

  it("marks ancestors repaired by a backward transition as caused by the target", () => {
    const task = node("t2", "t1", { archivedAt: now });
    const ancestors = [node("t1", null, { archivedAt: now })];
    const plan = buildTransitionPlan("UNARCHIVE", task, ancestors);
    expect(plan.events.map((e) => [e.taskId, e.causedBy])).toEqual([
      ["t2", undefined],
      ["t1", "t2"],
    ]);
  });

  it("skips descendants the stop rule pruned", () => {
    const task = node("t1", null);
    const descendants = [
      task,
      node("t2", "t1", { deletedAt: now }), // stop — keeps its date, emits nothing
      node("t3", "t1"),
    ];
    const plan = buildTransitionPlan("DELETE", task, [], descendants);
    expect(plan.events.map((e) => e.taskId)).toEqual(["t1", "t3"]);
  });

  it("plans no events when the transition writes nothing", () => {
    const task = node("t2", "t1");
    const plan = buildTransitionPlan("UNCOMPLETE", task, [node("t1", null)]);
    expect(plan.writes).toEqual([]);
    expect(plan.events).toEqual([]);
  });
});
