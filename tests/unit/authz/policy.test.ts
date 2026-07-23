import { describe, it, expect } from "vitest";
import { can, assertCan } from "@/lib/authz/policy";

const owner = { userId: "owner" };
const member = { userId: "member" };
const stranger = { userId: "stranger" };

const project = { userId: owner.userId };
const hostTask = {
  project,
  createdById: owner.userId,
  memberIds: [member.userId],
};
const memberTask = {
  project,
  createdById: member.userId,
  memberIds: [],
};
const strangerTask = {
  project,
  createdById: stranger.userId,
  memberIds: [],
};

describe("project acts", () => {
  it.each(["project:read", "project:update", "project:delete"] as const)(
    "%s allows owner",
    (act) => {
      expect(can(owner, act, project)).toBe(true);
    },
  );

  it.each(["project:read", "project:update", "project:delete"] as const)(
    "%s denies non-owner",
    (act) => {
      expect(can(member, act, project)).toBe(false);
      expect(can(stranger, act, project)).toBe(false);
    },
  );
});

describe("task:create (root task)", () => {
  it("allows project owner", () => {
    expect(can(owner, "task:create", project)).toBe(true);
  });

  it("denies everyone else", () => {
    expect(can(member, "task:create", project)).toBe(false);
    expect(can(stranger, "task:create", project)).toBe(false);
  });
});

describe("task:create-child", () => {
  it("allows project owner", () => {
    expect(can(owner, "task:create-child", hostTask)).toBe(true);
  });

  it("allows host task creator", () => {
    expect(can(owner, "task:create-child", hostTask)).toBe(true);
  });

  it("allows host task member", () => {
    expect(can(member, "task:create-child", hostTask)).toBe(true);
  });

  it("denies non-member on a task they did not create", () => {
    expect(can(stranger, "task:create-child", hostTask)).toBe(false);
  });

  it("allows task creator to add children to their own task even when not owner", () => {
    expect(can(member, "task:create-child", memberTask)).toBe(true);
  });

  it("denies strangers on a member-created task", () => {
    expect(can(stranger, "task:create-child", memberTask)).toBe(false);
  });
});

describe("task structural acts", () => {
  const acts = [
    "task:read",
    "task:update",
    "task:complete",
    "task:uncomplete",
    "task:archive",
    "task:unarchive",
    "task:delete",
    "task:restore",
  ] as const;

  it.each(acts)("%s allows project owner", (act) => {
    expect(can(owner, act, hostTask)).toBe(true);
    expect(can(owner, act, memberTask)).toBe(true);
  });

  it.each(acts)("%s allows task creator", (act) => {
    expect(can(member, act, memberTask)).toBe(true);
  });

  it.each(acts)("%s denies host task member", (act) => {
    expect(can(member, act, hostTask)).toBe(false);
  });

  it.each(acts)("%s denies strangers", (act) => {
    expect(can(stranger, act, hostTask)).toBe(false);
    expect(can(stranger, act, memberTask)).toBe(false);
  });
});

describe("timer:start", () => {
  it("allows task creator", () => {
    expect(can(member, "timer:start", { createdById: member.userId })).toBe(true);
  });

  it("denies project owner for another's task", () => {
    expect(can(owner, "timer:start", { createdById: member.userId })).toBe(false);
  });

  it("denies strangers", () => {
    expect(can(stranger, "timer:start", { createdById: member.userId })).toBe(
      false,
    );
  });
});

describe("timeEntry acts", () => {
  const entry = {
    project,
    taskCreatedById: member.userId,
    entryAuthorId: member.userId,
  };

  it("read allows project owner", () => {
    expect(can(owner, "timeEntry:read", entry)).toBe(true);
  });

  it("read allows entry author", () => {
    expect(can(member, "timeEntry:read", entry)).toBe(true);
  });

  it("read denies everyone else", () => {
    expect(can(stranger, "timeEntry:read", entry)).toBe(false);
  });

  it("create allows task creator", () => {
    expect(
      can(member, "timeEntry:create", {
        project,
        taskCreatedById: member.userId,
        entryAuthorId: member.userId,
      }),
    ).toBe(true);
    expect(
      can(owner, "timeEntry:create", {
        project,
        taskCreatedById: member.userId,
        entryAuthorId: member.userId,
      }),
    ).toBe(false);
  });

  it("update/delete allow entry author only", () => {
    expect(
      can(member, "timeEntry:update", {
        project,
        taskCreatedById: member.userId,
        entryAuthorId: member.userId,
      }),
    ).toBe(true);
    expect(
      can(member, "timeEntry:delete", {
        project,
        taskCreatedById: member.userId,
        entryAuthorId: member.userId,
      }),
    ).toBe(true);
    expect(
      can(owner, "timeEntry:update", {
        project,
        taskCreatedById: member.userId,
        entryAuthorId: member.userId,
      }),
    ).toBe(false);
    expect(
      can(stranger, "timeEntry:delete", {
        project,
        taskCreatedById: member.userId,
        entryAuthorId: member.userId,
      }),
    ).toBe(false);
  });
});

describe("assertCan", () => {
  it("returns null when authorized", () => {
    expect(assertCan(owner, "project:read", project)).toBeNull();
  });

  it("returns NOT_FOUND-masked error when unauthorized", () => {
    const result = assertCan(member, "project:delete", project);
    expect(result).toEqual({
      success: false,
      error: { code: "NOT_FOUND", message: "Cannot delete project" },
    });
  });
});
