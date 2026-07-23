import {
  createServiceErrorResponse,
  type ServiceErrorResponse,
} from "@/lib/errors";

// ─── Principal ───────────────────────────────────────────────────────────────

export type Principal = {
  userId: string;
};

// ─── Acts ──────────────────────────────────────────────────────────────────────

export type Act =
  | "project:read"
  | "project:update"
  | "project:delete"
  | "task:create"
  | "task:create-child"
  | "task:read"
  | "task:update"
  | "task:complete"
  | "task:uncomplete"
  | "task:archive"
  | "task:unarchive"
  | "task:delete"
  | "task:restore"
  | "timer:start"
  | "timeEntry:read"
  | "timeEntry:create"
  | "timeEntry:update"
  | "timeEntry:delete";

// ─── Resources ─────────────────────────────────────────────────────────────────

export type ProjectResource = {
  userId: string;
};

export type TaskResource = {
  project: { userId: string };
  createdById: string;
  /** ids of users who are TaskMembers of this task (the host). */
  memberIds?: string[];
};

export type TimeEntryResource = {
  project: { userId: string };
  taskCreatedById: string;
  entryAuthorId: string;
};

export type PolicyResource =
  | ProjectResource
  | TaskResource
  | { createdById: string }
  | TimeEntryResource;

// ─── Rule helpers ──────────────────────────────────────────────────────────────

function isProjectOwner(p: Principal, r: { userId: string }): boolean {
  return r.userId === p.userId;
}

function isTaskCreator(p: Principal, r: TaskResource): boolean {
  return r.createdById === p.userId;
}

function isTaskMember(p: Principal, r: TaskResource): boolean {
  return (r.memberIds ?? []).includes(p.userId);
}

// ─── can ───────────────────────────────────────────────────────────────────────

export function can(
  principal: Principal,
  act: Act,
  resource: PolicyResource,
): boolean {
  switch (act) {
    // Structural: project owner only
    case "project:read":
    case "project:update":
    case "project:delete":
    case "task:create":
      return isProjectOwner(principal, resource as ProjectResource);

    // Structural on an existing task: project owner, or task creator, or task member
    // for the narrow `create-child` act only.
    case "task:create-child": {
      const r = resource as TaskResource;
      return (
        isProjectOwner(principal, r.project) ||
        isTaskCreator(principal, r) ||
        isTaskMember(principal, r)
      );
    }

    // Structural on an existing task: project owner or task creator.
    // A Task Member is *not* granted these on the host.
    case "task:read":
    case "task:update":
    case "task:complete":
    case "task:uncomplete":
    case "task:archive":
    case "task:unarchive":
    case "task:delete":
    case "task:restore": {
      const r = resource as TaskResource;
      return (
        isProjectOwner(principal, r.project) || isTaskCreator(principal, r)
      );
    }

    // Execution: task creator only.
    case "timer:start":
      return (resource as { createdById: string }).createdById === principal.userId;

    // TimeEntry: owner reads; task creator creates; author mutates.
    case "timeEntry:read": {
      const r = resource as TimeEntryResource;
      return (
        isProjectOwner(principal, r.project) ||
        r.entryAuthorId === principal.userId
      );
    }
    case "timeEntry:create":
      return (
        (resource as { taskCreatedById: string }).taskCreatedById ===
        principal.userId
      );
    case "timeEntry:update":
    case "timeEntry:delete":
      return (
        (resource as { entryAuthorId: string }).entryAuthorId === principal.userId
      );

    default: {
      const _exhaustive: never = act;
      return _exhaustive;
    }
  }
}

// ─── assertCan ─────────────────────────────────────────────────────────────────

/**
 * Returns null when authorized. Otherwise returns a NOT_FOUND-masked error,
 * so callers never leak resource existence.
 */
export function assertCan(
  principal: Principal,
  act: Act,
  resource: PolicyResource,
): ServiceErrorResponse | null {
  if (can(principal, act, resource)) return null;

  return createServiceErrorResponse(
    "NOT_FOUND",
    act.includes(":")
      ? `Cannot ${act.split(":")[1]} ${act.split(":")[0]}`
      : "Resource not found",
  );
}
