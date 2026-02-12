import { TOGGL_API } from "@/util/consts";
import { getAuthHeader, createErrorResponse } from "@/util/lib";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const Params = z.object({
  tags: z.array(z.string()).min(1, "At least one tag is required"),
  workspaceId: z.number().int().positive("Workspace ID must be positive"),
  start: z.coerce.date().optional(),
  createdWith: z.string().optional(),
  description: z.string().optional(),
  billable: z.boolean().optional(),
});

export type StartNewEntryParams = z.infer<typeof Params>;

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

  try {
    const res = await fetch(
      `${TOGGL_API}/workspaces/${params.workspaceId}/time_entries`,
      {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify({
          tags: params.tags,
          workspace_id: params.workspaceId,
          start: params.start
            ? params.start.toISOString()
            : new Date().toISOString(),
          created_with: params.createdWith || "issue-tracker-app",
          description: params.description,
          duration: -1,
          billable: params.billable || false,
          stop: null,
        }),
      },
    );

    if (!res.ok) {
      const errorData = await res.text();
      return NextResponse.json(
        createErrorResponse(
          "TOGGL_API_ERROR",
          `Failed to create time entry: ${res.statusText}`,
          { status: res.status, details: errorData },
        ),
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      createErrorResponse("INTERNAL_ERROR", message, err),
      { status: 500 },
    );
  }
}
