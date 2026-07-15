import { describe, it, expect } from "vitest";
import {
  getRestoreCheck,
  getAffectedSummary,
} from "@/app/s/project/[project-id]/archive/restoreCheck";
import { validateTransition } from "@/lib/domain/taskHierarchyPolicy";
import type { TaskNode, TaskLineage } from "@/lib/schema/task";

// The restore dialog's preflight is an adapter over the domain policy (#64):
// it must reach the same verdict the server will, and only put it into words.

const now = new Date("2026-03-10T12:00:00Z");
const earlier = new Date("2026-02-01T09:00:00Z");

function lineage(
  id: string,
  parentId: string | null,
  overrides: Partial<TaskLineage> = {},
): TaskLineage {
  return {
    id,
    parentId,
    title: `Task ${id}`,
    completedAt: null,
    archivedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

/** The dialog is handed a full TaskNode; only its lineage fields matter here. */
function taskNode(t: TaskLineage): TaskNode {
  return t as unknown as TaskNode;
}

function mapOf(...tasks: TaskLineage[]): Record<string, TaskLineage> {
  return Object.fromEntries(tasks.map((t) => [t.id, t]));
}

describe("getRestoreCheck — unarchive", () => {
  it("allows a plain unarchive and names no other task", () => {
    const task = lineage("t2", "t1", { archivedAt: now });
    const parent = lineage("t1", null);
    const check = getRestoreCheck(taskNode(task), "archived", mapOf(parent));

    expect(check.canRestore).toBe(true);
    expect(check.warning).toBeUndefined();
    expect(check.affectedAncestors).toEqual([]);
  });

  it("refuses under a deleted ancestor, naming it", () => {
    const task = lineage("t2", "t1", { archivedAt: now });
    const parent = lineage("t1", null, { deletedAt: now, title: "Oberaufgabe" });
    const check = getRestoreCheck(taskNode(task), "archived", mapOf(parent));

    expect(check.canRestore).toBe(false);
    expect(check.description).toContain("Oberaufgabe");
    expect(check.description).toContain("gelöscht");
  });

  it("a refusal about the task itself does not call it its own parent", () => {
    // Stale second tab: the task is no longer archived. parentMap holds every
    // project task, so the blocker lookup finds the task itself — the message
    // must not present it as "die Überaufgabe".
    const task = lineage("t2", "t1");
    const parent = lineage("t1", null);
    const check = getRestoreCheck(
      taskNode(task),
      "archived",
      mapOf(task, parent),
    );

    expect(check.canRestore).toBe(false);
    expect(check.description).not.toContain("Überaufgabe");
    expect(check.description).toContain("nicht mehr archiviert");
  });

  it("a listed task deleted in the meantime is named deleted, not as a parent", () => {
    const task = lineage("t2", "t1", { archivedAt: now, deletedAt: now });
    const parent = lineage("t1", null);
    const check = getRestoreCheck(
      taskNode(task),
      "archived",
      mapOf(task, parent),
    );

    expect(check.canRestore).toBe(false);
    expect(check.description).not.toContain("Überaufgabe");
    expect(check.description).toContain("gelöscht");
  });

  it("lists the archived ancestors that come back with it", () => {
    const task = lineage("t2", "t1", { archivedAt: now });
    const parent = lineage("t1", "t0", { archivedAt: now });
    const root = lineage("t0", null);
    const check = getRestoreCheck(
      taskNode(task),
      "archived",
      mapOf(parent, root),
    );

    expect(check.canRestore).toBe(true);
    expect(check.affectedAncestors.map((a) => a.id)).toEqual(["t1"]);
    expect(getAffectedSummary(check.affectedAncestors)).toContain(
      "1 weitere Aufgabe",
    );
  });

  it("warns that a task under a completed parent comes back done (#63)", () => {
    const task = lineage("t2", "t1", { archivedAt: now });
    const parent = lineage("t1", null, { completedAt: earlier });
    const check = getRestoreCheck(taskNode(task), "archived", mapOf(parent));

    expect(check.canRestore).toBe(true);
    expect(check.warning).toContain("erledigt");
  });
});

describe("getRestoreCheck — undelete", () => {
  it("allows a plain undelete", () => {
    const task = lineage("t2", "t1", { deletedAt: now });
    const parent = lineage("t1", null);
    const check = getRestoreCheck(taskNode(task), "deleted", mapOf(parent));

    expect(check.canRestore).toBe(true);
    expect(check.warning).toBeUndefined();
  });

  // The drift this whole chain set out to fix: the dialog used to refuse this
  // outright while the server allowed it. Now it allows it and says what the
  // task will come back as.
  it("allows undelete under an archived ancestor, warning it returns archived", () => {
    const task = lineage("t2", "t1", { deletedAt: now });
    const parent = lineage("t1", null, { archivedAt: earlier });
    const check = getRestoreCheck(taskNode(task), "deleted", mapOf(parent));

    expect(check.canRestore).toBe(true);
    expect(check.warning).toContain("archiviert");
  });
});

describe("getRestoreCheck — agrees with the server", () => {
  const cases: Array<{
    name: string;
    task: TaskLineage;
    ancestors: TaskLineage[];
    mode: "archived" | "deleted";
  }> = [
    {
      name: "unarchive, clean parent",
      task: lineage("t2", "t1", { archivedAt: now }),
      ancestors: [lineage("t1", null)],
      mode: "archived",
    },
    {
      name: "unarchive under a deleted parent",
      task: lineage("t2", "t1", { archivedAt: now }),
      ancestors: [lineage("t1", null, { deletedAt: now })],
      mode: "archived",
    },
    {
      name: "unarchive under a completed parent",
      task: lineage("t2", "t1", { archivedAt: now }),
      ancestors: [lineage("t1", null, { completedAt: earlier })],
      mode: "archived",
    },
    {
      name: "undelete under an archived parent",
      task: lineage("t2", "t1", { deletedAt: now }),
      ancestors: [lineage("t1", null, { archivedAt: earlier })],
      mode: "deleted",
    },
    {
      name: "undelete across a deletion gap",
      task: lineage("t3", "t2", { deletedAt: now }),
      ancestors: [
        lineage("t2", "t1"), // not deleted
        lineage("t1", null, { deletedAt: now }), // deleted above it — a gap
      ],
      mode: "deleted",
    },
  ];

  it.each(cases)(
    "$name — the dialog's verdict matches validateTransition",
    ({ task, ancestors, mode }) => {
      const kind = mode === "archived" ? "UNARCHIVE" : "UNDELETE";
      const check = getRestoreCheck(
        taskNode(task),
        mode,
        mapOf(...ancestors),
      );
      const server = validateTransition(kind, task, ancestors);

      expect(check.canRestore).toBe(server.valid);
    },
  );
});
