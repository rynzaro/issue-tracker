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
│   │   ├── create-account/           # Account creation endpoint
│   │   ├── create-tag/               # Toggl tag creation (legacy)
│   │   ├── create-tag-without-permission/  # Toggl tag creation (legacy)
│   │   └── start-new-entry/          # Toggl time entry (legacy)
│   ├── public/                       # Unauthenticated pages
│   │   ├── login/
│   │   ├── sign-up/
│   │   └── forgot-password/
│   └── s/                            # Authenticated pages (protected by middleware)
│       ├── layout.tsx                # Auth guard + session provider + navbar
│       ├── main/page.tsx             # Landing page after login
│       ├── logout/page.tsx
│       └── [workspaceId]/            # Toggl workspace view (legacy, to be replaced)
│           ├── page.tsx
│           ├── taskManager.tsx
│           └── taskHierarchy.tsx
├── components/                       # Shared UI components (button, input, dialog, etc.)
├── lib/
│   ├── prisma.ts                     # Prisma client singleton
│   ├── actions.ts                    # Auth server actions (authenticate, performLogout)
│   ├── types.ts                      # Toggl types (Workspace, ActiveEntry, Tag)
│   ├── consts.ts                     # Toggl API URLs and workspace IDs
│   ├── errors.ts                     # Error types (ApiError, ApiErrorResponse)
│   ├── util.ts                       # Toggl API wrappers + generic utilities
│   └── formUtils.ts                  # Form state management helpers
├── prisma/
│   └── schema.prisma                 # Database schema
├── auth.ts                           # NextAuth configuration
├── auth.config.ts                    # NextAuth base config
└── proxy.ts                          # NextAuth middleware
```

## Current Data Model

The Prisma schema currently has three bare models:

```prisma
model User {
    id       String    @id @default(cuid())
    email    String    @unique
    password String
    projects Project[]
}

model Project {
    id          String @id @default(cuid())
    name        String
    description String
    ownerId     String
    owner       User   @relation(fields: [ownerId], references: [id])
    tasks       Task[]
}

model Task {
    id          String   @id @default(cuid())
    title       String
    description String
    project     Project? @relation(fields: [projectId], references: [id])
    projectId   String?
}
```

These models are not yet used for the app's core functionality. The current task management UI talks to the Toggl API directly (legacy code in `lib/util.ts`, `lib/consts.ts`, `lib/types.ts`).

## What Works Today

- **Auth**: Login, sign-up, logout via NextAuth 5 credentials provider
- **Protected routing**: Middleware in `proxy.ts` guards `/s/*` routes
- **UI component library**: Full set of shared components (button, input, dialog, dropdown, table, sidebar, navbar, card, badge, etc.)
- **Database**: MariaDB via Docker, Prisma client connected
- **Toggl integration (legacy)**: API routes for creating tags and starting entries — these will be reorganized

## Code Conventions

- **File naming**: kebab-case for components (`task-tree.tsx`), camelCase for services/actions (`task.service.ts`)
- **Prisma models**: PascalCase (`TaskEvent`), enums: UPPER_SNAKE_CASE (`ESTIMATE_CHANGED`)
- **UI language**: English (some German strings remain in the codebase — convert these to English)
- **No secrets in env for Toggl**: Toggl API tokens are per-user in the database
