# Developer Guide

## Project Overview

A time tracking application that helps developers understand where their time estimates fall short. Users track time on hierarchical tasks with estimates, and the system will analyze estimation accuracy by decomposing errors into scope errors (missed sub-tasks) vs effort errors (underestimated known tasks).

The app works standalone with its own database, and will optionally integrate with Toggl Track (per-user tokens, not env vars).

## Tech Stack

| Layer           | Technology                                      |
| --------------- | ----------------------------------------------- |
| Framework       | Next.js 16 (App Router)                         |
| UI              | React 19, Tailwind CSS 4, HeadlessUI, Heroicons |
| Database        | MariaDB (via Docker), Prisma 7 ORM              |
| Auth            | NextAuth 5 (credentials provider, bcrypt)       |
| Validation      | Zod                                             |
| Language        | TypeScript 5                                    |
| Package Manager | pnpm                                            |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- Docker (for MariaDB)

### Setup

```bash
git clone <repo-url>
cd issue-tracker
pnpm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="mysql://issue_tracker:issue_tracker@127.0.0.1:3306/issue_tracker"
AUTH_SECRET="your-secret-here"       # generate with: openssl rand -base64 32
```

No Toggl env vars — each user enters their own Toggl API token in the in-app Settings page.

### Database

```bash
pnpm run db:start          # Start MariaDB via Docker
npx prisma migrate dev     # Run migrations
npx prisma generate        # Generate Prisma Client
```

### Development

```bash
pnpm run dev               # Starts Docker DB + Next.js dev server
```

The app runs at `http://localhost:3000`. Auth-protected pages live under `/s/`.

## Current Directory Structure

```
issue-tracker/
├── app/
│   ├── layout.tsx                    # Root layout
│   ├── globals.css                   # Global styles (Tailwind)
│   ├── api/
│   │   ├── auth/[...nextauth]/       # NextAuth route handler
│   │   └── create-account/           # Account creation endpoint
│   ├── public/                       # Unauthenticated pages
│   │   ├── login/
│   │   ├── sign-up/
│   │   └── forgot-password/
│   └── s/                            # Authenticated pages (protected by middleware)
│       ├── layout.tsx                # Auth guard + session provider + navbar
│       ├── main/page.tsx             # Landing page after login
│       ├── logout/page.tsx
│       └── project/
│           ├── create/               # Project creation page
│           └── [project-id]/         # Project task tree view
│               ├── page.tsx          # Server component — fetches project + tasks
│               ├── tasksWrapper.tsx   # Client component — task tree + create/edit dialogs
│               ├── tasks.tsx         # Recursive task row rendering
│               ├── taskRowButton.tsx  # Task row action buttons
│               └── newRootTask.tsx    # Root task creation dialog
├── components/                       # Shared UI components (button, input, dialog, dropdown, etc.)
│   └── forms/                        # Form components (create-project-form.tsx)
├── lib/
│   ├── prisma.ts                     # Prisma client singleton
│   ├── hooks.ts                      # React hooks (usePersistentValue, useTaskForm)
│   ├── formUtils.ts                  # Form state management (FormState<T>, handleInput, etc.)
│   ├── errors.ts                     # Error types (ApiError, ApiErrorResponse)
│   ├── types.ts                      # App-level types
│   ├── util.ts                       # Generic utilities (validatePassword, createErrorResponse)
│   ├── actions.ts                    # Legacy auth actions (superseded by lib/actions/auth.actions.ts)
│   ├── consts.ts                     # Legacy Toggl constants (superseded by lib/toggl/consts.ts)
│   ├── schema/                       # Zod schemas + derived types
│   │   ├── task.ts                   # CreateTaskSchema, UpdateTaskSchema, TaskNode type
│   │   └── project.ts               # Project schemas
│   ├── services/                     # Business logic (pure functions, Prisma calls)
│   │   ├── project.service.ts        # Project reads
│   │   ├── task.service.ts           # Task CRUD (create, update)
│   │   ├── serviceUtil.ts            # serviceAction wrapper, error responses
│   │   └── ...                       # Skeleton services for future iterations
│   ├── actions/                      # Server Actions ("use server" wrappers around services)
│   │   ├── auth.actions.ts           # Login/logout
│   │   ├── project.actions.ts        # Project actions
│   │   ├── task.actions.ts           # createTaskAction, updateTaskAction
│   │   └── ...                       # Skeleton actions for future iterations
│   └── toggl/                        # Isolated Toggl integration (iteration 6)
│       ├── api.ts
│       ├── types.ts
│       └── consts.ts
├── legacy/                           # Old Toggl workspace code (to be deleted)
│   ├── [workspaceId]/
│   ├── create-tag/
│   └── create-tag-without-permission/
├── prisma/
│   └── schema.prisma                 # Full data model (8 models, 4 enums)
├── auth.ts                           # NextAuth configuration
├── auth.config.ts                    # NextAuth base config
└── proxy.ts                          # NextAuth middleware
```

## What Works Today

- **Auth**: Login, sign-up, logout via NextAuth 5 credentials provider
- **Protected routing**: Middleware in `proxy.ts` guards `/s/*` routes
- **Project create + list**: Create projects, view project list on main page (no edit/delete UI yet)
- **Task CRUD**: Create root tasks and sub-tasks, edit tasks (title, description, estimates)
- **Task hierarchy**: Self-referential `parentId` with recursive tree rendering
- **Client-side validation**: `useTaskForm` hook validates before submit, inline error display
- **Form state management**: `FormState<T>` with `handleInput` (auto-clears errors on change)
- **UI component library**: Full set of shared components (button, input, dialog, dropdown, table, sidebar, navbar, card, badge, etc.)
- **Database**: MariaDB via Docker, Prisma 7 with full schema (8 models, 4 enums)
- **Service pattern**: `serviceAction()` wrapper for consistent error handling and auth checks

## Code Conventions

- **File naming**: kebab-case for route files (`create-account/`), camelCase for client components and services (`tasksWrapper.tsx`, `task.service.ts`)
- **Prisma models**: PascalCase (`TaskEvent`), enums: UPPER_SNAKE_CASE (`ESTIMATE_CHANGED`)
- **UI language**: German (this is intentional — the app is used in German)
- **Validation**: Zod schemas in `lib/schema/` are the server-side authority. Client mirrors key rules in `useTaskForm.validateForm()` for UX. Post-MVP: unify via Zod on client.
- **Service pattern**: All DB operations go through `lib/services/*.service.ts`, wrapped by `lib/actions/*.actions.ts` (Server Actions). Services use `serviceAction()` from `serviceUtil.ts` for auth + error handling.
- **No secrets in env for Toggl**: Toggl API tokens are per-user in the database
