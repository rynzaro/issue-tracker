import { ApiError } from "@/lib/errors";
import { getAuthHeader, createErrorResponse } from "@/lib/util";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const Params = z.object({
  name: z.string().min(1, "Name is required"),
  workspaceId: z.number().int().positive("Workspace ID must be positive"),
});

export type CreateTagParams = z.infer<typeof Params>;
export type CreateTagResponse = {
  id: number;
  workspace_id: number;
  name: string;
};

export async function POST(request: NextRequest) {
  const { data: params, error } = Params.safeParse(await request.json());

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

  const response = await fetch(
    `https://api.track.toggl.com/api/v9/workspaces/${params.workspaceId}/tags`,
    {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify({ name: params.name }),
    },
  );

  if (!response.ok) {
    const errorData = await response.text();
    return NextResponse.json(
      createErrorResponse(
        "TOGGL_API_ERROR",
        `Failed to create tag: ${response.statusText}`,
        { status: response.status, details: errorData },
      ),
      { status: response.status },
    );
  }

  return NextResponse.json({ ok: true, ...(await response.json()) });
}
