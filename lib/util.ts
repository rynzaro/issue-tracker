import { TOGGL_ME, TOGGL_API } from "./consts";

export type ApiErrorCode =
  | "ZOD_VALIDATION_ERROR"
  | "TOGGL_API_ERROR"
  | "INTERNAL_SERVER_ERROR"
  | "INPUT_FORMAT_ERROR";

export type ApiErrorResponse = {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
};

export function getAuthHeader() {
  const token = process.env.TOGGL_API_TOKEN;
  if (!token) return;

  const base64 = Buffer.from(`${token}:api_token`).toString("base64");

  return {
    Authorization: `Basic ${base64}`,
    "Content-Type": "application/json",
  };
}

/**
 * Create a normalized error response
 */
export function createErrorResponse(
  code: ApiErrorCode,
  message: string,
  details?: unknown,
): ApiErrorResponse {
  return {
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };
}

export async function getOrganizations(): Promise<Response> {
  return await fetch(`${TOGGL_ME}/organizations`, {
    headers: getAuthHeader(),
  });
}

export async function getWorkspace(workspace_id: number): Promise<Response> {
  return await fetch(`${TOGGL_API}/workspaces/${workspace_id}`, {
    headers: getAuthHeader(),
  });
}

export async function getWorkspaces(): Promise<Response> {
  return fetch(`${TOGGL_API}/workspaces`, {
    headers: getAuthHeader(),
  });
}

export async function getActiveEntries(): Promise<Response> {
  return await fetch(`${TOGGL_ME}/time_entries/current`, {
    headers: getAuthHeader(),
  });
}

export async function getWorkspaceTags(
  workspace_id: number,
): Promise<Response> {
  return await fetch(`${TOGGL_API}/workspaces/${workspace_id}/tags`, {
    headers: getAuthHeader(),
  });
}

export async function getAllTags(): Promise<Response> {
  return await fetch(`${TOGGL_ME}/tags`, {
    headers: getAuthHeader(),
  });
}

export function parseTaskString(taskStr: string): string[] | undefined {
  if (!taskStr.startsWith("T:")) {
    return;
  }
  return taskStr.split("::").map((segment) => segment.replace("T:", ""));
}

export function validatePassword(password: string): boolean {
  return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()-])[A-Za-z\d!@#$%^&*()-]{8,}$/.test(
    password,
  );
}
