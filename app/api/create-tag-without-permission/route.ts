import { TOGGL_API } from "@/lib/consts";
import { getAuthHeader, createErrorResponse } from "@/lib/util";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const Params = z.object({
  name: z.string().min(1, "Name is required"),
  workspaceId: z.number().int().positive("Workspace ID must be positive"),
});

export type CreateTagWithoutPermissionParams = z.infer<typeof Params>;

export async function POST(req: NextRequest) {
  const { data: params, error } = Params.safeParse(await req.json());

  if (error) {
    const details = error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    return NextResponse.json(
      createErrorResponse(
        "ZOD_VALIDATION_ERROR",
        "Input validation failed",
        details,
      ),
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  const body = {
    workspace_id: params.workspaceId,
    description: "seed tag",
    created_with: "issue-tracker-app",
    start: now,
    duration: 0,
    stop: now,
    tags: [params.name],
    billable: false,
  };

  try {
    const entryRes = await fetch(`${TOGGL_API}/time_entries`, {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify(body),
    });

    if (!entryRes.ok) {
      const errorData = await entryRes.text();
      return NextResponse.json(
        createErrorResponse(
          "TOGGL_API_ERROR",
          `Failed to create time entry: ${entryRes.statusText}`,
          { status: entryRes.status, details: errorData },
        ),
        { status: entryRes.status },
      );
    }

    const { id } = await entryRes.json();

    const deleteRes = await fetch(`${TOGGL_API}/time_entries/${id}`, {
      method: "DELETE",
      headers: getAuthHeader(),
    });

    if (!deleteRes.ok) {
      const errorData = await deleteRes.text();
      return NextResponse.json(
        createErrorResponse(
          "TOGGL_API_ERROR",
          `Failed to delete entry: ${deleteRes.statusText}`,
          { status: deleteRes.status, details: errorData },
        ),
        { status: deleteRes.status },
      );
    }

    return NextResponse.json({ ok: true, ...(await deleteRes.json()) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      createErrorResponse("INTERNAL_ERROR", message, err),
      { status: 500 },
    );
  }
}
