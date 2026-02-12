This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Tasks

Every Task is identified with the pre-handle `T` followed by `:name`. Every Task can be the root or the sub-task of any other task. A child task always has one parent, and whenever a child task is started, that associated parent will run as well.

`::` indicates a child, meaning `T:parent_name::T:child_name` are parent of child, indicated by their names.

## Error Handling

### Response Format

```json
{ "error": { "code": "ERROR_CODE", "message": "Description", "details": {} } }
```

### Error Codes

| Code                   | Status      | When                    |
| ---------------------- | ----------- | ----------------------- |
| `ZOD_VALIDATION_ERROR` | 400         | Input validation failed |
| `TOGGL_API_ERROR`      | passthrough | External API error      |
| `INTERNAL_ERROR`       | 500         | Unexpected error        |

### Helper (`util/lib.ts`)

```typescript
export function createErrorResponse(
  code: string,
  message: string,
  details?: unknown,
) {
  return { error: { code, message, ...(details && { details }) } };
}
```

### Route Template

```typescript
import { TOGGL_API } from "@/util/consts";
import { getAuthHeader, createErrorResponse } from "@/util/lib";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const Params = z.object({
  name: z.string().min(1, "Required"),
  workspaceId: z.number().int().positive(),
});

export type RouteParams = z.infer<typeof Params>;

export async function POST(req: NextRequest) {
  const { data: params, error } = Params.safeParse(await req.json());

  if (error) {
    const details = error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    }));
    return NextResponse.json(
      createErrorResponse("ZOD_VALIDATION_ERROR", "Validation failed", details),
      { status: 400 },
    );
  }

  try {
    const res = await fetch(`${TOGGL_API}/endpoint`, {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify({
        workspace_id: params.workspaceId,
        name: params.name,
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        createErrorResponse(
          "TOGGL_API_ERROR",
          res.statusText,
          await res.text(),
        ),
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    return NextResponse.json(
      createErrorResponse(
        "INTERNAL_ERROR",
        err instanceof Error ? err.message : "Unknown",
        err,
      ),
      { status: 500 },
    );
  }
}
```

### Key Rules

- Use `safeParse()` and check `if (error)` before proceeding
- Convert camelCase params → snake_case for Toggl API (`workspaceId` → `workspace_id`)
- Assign `response.json()` to variable before spreading (avoids TS2698)
- Pass through Toggl's HTTP status code in error responses
- Export `type RouteParams = z.infer<typeof Params>` for client use

## Todos

- start entries + parent entries
- stop entries + parent entries
- check for already existing tags
- notification system
- navbar
