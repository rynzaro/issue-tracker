import { TOGGL_ME, TOGGL_API } from "./consts";

export function getAuthHeader() {
  const token = process.env.TOGGL_API_TOKEN;
  if (!token) return;

  const base64 = Buffer.from(`${token}:api_token`).toString("base64");

  return {
    Authorization: `Basic ${base64}`,
    "Content-Type": "application/json",
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
