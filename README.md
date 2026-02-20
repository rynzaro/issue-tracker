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

### Service Layer Error Handling

Result types (Go-style). Every service fn returns `ServiceResponseWithData<T>`. Discriminated union on `success`.

```
success: true  → { data: T }
success: false → { error: { code, message, details? } }
```

All helpers in serviceUtil.ts.

#### Error Codes

| Code                    | When                                   | Client-safe details? |
| ----------------------- | -------------------------------------- | -------------------- |
| `VALIDATION_ERROR`      | Bad input (Zod)                        | Yes — field errors   |
| `NOT_FOUND`             | Resource missing                       | No                   |
| `AUTHORIZATION_ERROR`   | No session or wrong owner              | No                   |
| `UNEXPECTED_ERROR`      | Impossible state — needs investigation | No                   |
| `INTERNAL_SERVER_ERROR` | DB/infra failure                       | No                   |

#### Wrappers

Pick one per service fn. All log internally, never leak raw errors.

| Wrapper                                           | For                                    | Handles                                                                                 |
| ------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------- |
| `serviceQuery(fn, errMsg)`                        | `findMany`, always-returns-data ops    | catch → `INTERNAL_SERVER_ERROR`                                                         |
| `serviceQueryOrNotFound(fn, notFoundMsg, errMsg)` | `findUnique`, `update`, `delete` by ID | null → `NOT_FOUND`, P2025 → `NOT_FOUND`, catch → `INTERNAL_SERVER_ERROR`                |
| `serviceAction(fn, errMsg)`                       | Complex ops w/ guards                  | Callback controls returns. Catches `ServiceError` from `unwrap()`. Catch-all safety net |

#### Validation

Action layer validates before calling service. `validateInput` returns `VALIDATION_ERROR` w/ Zod flattened field errors — safe for client.

```ts
const validated = validateInput(CreateProjectSchema, params);
if (!validated.success) return validated;
```

#### Chaining (`unwrap`)

Compose service calls inside `serviceAction` without `if (!r.success) return r` boilerplate:

```ts
return serviceAction(async () => {
  const project = unwrap(await getProjectById(id));
  const tasks = unwrap(await getTasksByProject(project.id));
  return createSuccessResponseWithData(tasks);
}, "Failed to load");
```

`unwrap` extracts `.data` or throws `ServiceError` → `serviceAction` catches + passes through original error response.

#### Layer Flow

- **Action** — auth → `validateInput` → call service → `revalidatePath` on success
- **Service** — ownership/biz guards → DB ops via wrapper
- **Prisma** — never called outside a wrapper or `serviceAction` callback

#### Rules

- No `try/catch` in actions — services catch everything
- No raw `Error` in responses — wrappers log internally, return clean error
- `details` only for `VALIDATION_ERROR` — all other codes omit it
- `UNEXPECTED_ERROR` for impossible states, not `NOT_FOUND`

## Todos

- start entries + parent entries
- stop entries + parent entries
- check for already existing tags
- notification system
- navbar
