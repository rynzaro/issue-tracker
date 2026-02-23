export function buildUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-user-1",
    email: "test@example.com",
    password: "hashed-password",
    togglApiToken: null,
    ...overrides,
  };
}

export function buildProject(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-project-1",
    name: "Test Project",
    userId: "test-user-1",
    description: null,
    projectSettingsId: 1,
    isDefault: false,
    createdAt: new Date("2026-01-01"),
    deletedAt: null,
    ...overrides,
  };
}

export function buildTask(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-task-1",
    projectId: "test-project-1",
    createdById: "test-user-1",
    title: "Test Task",
    description: null,
    estimate: 60,
    depth: 0,
    togglTagId: null,
    togglTagName: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    completedAt: null,
    archivedAt: null,
    deletedAt: null,
    parentId: null,
    ...overrides,
  };
}

export function buildActiveTimer(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-timer-1",
    userId: "test-user-1",
    taskId: "test-task-1",
    startedAt: new Date("2026-01-01T10:00:00Z"),
    ...overrides,
  };
}

export function buildTimeEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-time-entry-1",
    startedAt: new Date("2026-01-01T10:00:00Z"),
    stoppedAt: new Date("2026-01-01T11:00:00Z"),
    duration: 3600,
    createdAt: new Date("2026-01-01T11:00:00Z"),
    taskId: "test-task-1",
    userId: "test-user-1",
    ...overrides,
  };
}
