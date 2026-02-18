# User Guide

## What Is This App?

A time tracker that helps you estimate better. You track time on tasks, set estimates for how long you think they'll take, and the app tells you where your estimates went wrong — and why.

Over time, you'll learn whether your estimation problems come from:

- **Missing scope** — you forgot to plan for things
- **Underestimating effort** — you knew what to do but thought it'd be faster

## Core Concepts

### Projects

A project groups related tasks. Examples: "Website Redesign", "API Migration", "Q1 Sprint".

### Tasks

A task is something you need to do. Every task has:

- **Title** — what the task is
- **Description / Notes** — any details, context, or notes you want to keep
- **Estimate** (optional) — how long you think it'll take, in minutes or hours
- **Category** (optional) — a label like "frontend", "backend", "design", "devops"
- **Status** — Planning, Active, Completed, or Archived

### Sub-Tasks

Any task can have sub-tasks. Sub-tasks break a big task into smaller, trackable pieces.

When you track time on a sub-task, the parent task's total time includes that sub-task's time automatically. Time always rolls up from children to parents.

### Time Tracking

Start a timer on a task. Stop it when you're done (or when you switch tasks). The app records exactly how long you spent.

You can have one timer running at a time. Starting a new timer stops the previous one.

### Estimates

Before you start working, estimate how long a task will take. After you're done, compare your estimate to reality.

You can estimate at any level:

- Estimate the parent task as a whole (your "gut feel")
- Estimate each sub-task individually (your "breakdown")
- Or both — the app tracks them separately

Estimates can be changed at any time. Every change is recorded.

### Checkpoints

A checkpoint is a snapshot of your plan at a specific moment. It records:

- Which sub-tasks exist
- What their estimates are
- How much time has been tracked so far

Checkpoints let you look back and see how your plan evolved.

### Todos

A lightweight checklist you can attach to any task. Each todo item has:

- **Text** — what needs to be done
- **Checkbox** — mark it complete
- **Estimate** (optional) — a rough time estimate in minutes, so you can plan without creating a full sub-task

Todos are simpler than sub-tasks — no time tracking, no hierarchy. But you can convert any todo into a full sub-task (with its own time tracking and deeper breakdown) whenever you're ready. When converted, the todo's estimate carries over to the new sub-task.

## Getting Started

### 1. Create an Account

Go to the sign-up page and create an account with your email and password.

### 2. Create a Project

After logging in, you'll see the main page. Create a new project — give it a name and an optional description.

### 3. Add Tasks

Inside a project, add tasks. For each task:

- Give it a descriptive title
- Add an estimate if you have one (don't worry if you don't yet)
- Add notes in the description field
- Set a category if you want to analyze accuracy by type of work later

### 4. Break Down Tasks

Add sub-tasks to break a larger task into smaller pieces. Each sub-task can have its own estimate.

You can nest sub-tasks as deep as you want: Task → Sub-task → Sub-sub-task → ...

### 5. Track Time

Click the play button on a task to start tracking time. Click stop when you're done or switching tasks.

The app shows:

- Time tracked on each individual task
- Total time rolled up to parent tasks (sum of all children)

### 6. Review Your Accuracy

After completing tasks, look at how your estimates compared to reality. The app shows you:

- **Total estimated time** vs **total actual time**
- Which tasks you overestimated or underestimated
- Whether the overrun was because of scope (missing tasks) or effort (underestimated tasks)

## Checkpoints In Detail

### Automatic Checkpoints

The app creates checkpoints automatically at key moments:

| When                                 | What it means                                                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| **You start your first timer**       | "This is what I planned before I started working." This becomes your baseline — the reference point for all accuracy analysis. |
| **You add a sub-task while working** | "I discovered I need to do something I didn't plan for." This is a scope change.                                               |
| **You change an estimate**           | "I realized this task takes more (or less) time than I thought." This is an effort reassessment.                               |
| **You complete a task**              | "Here's the final result." This captures the actual outcome.                                                                   |

Automatic checkpoints are scoped to the changed task and its parent. If you change a sub-task's estimate, checkpoints are created for that sub-task and its parent — not for the grandparent or higher.

### Manual Checkpoints

You can save a checkpoint manually at any time using the "Save Checkpoint" button. Use this when:

- You've finished a planning session and want to lock in your thinking
- You're about to make a major change and want to record the "before"
- You want to mark a milestone

### Checkpoint Settings

In Settings, you can:

- **Turn auto-checkpoints on/off** globally
- **Toggle specific triggers** — e.g., keep scope change checkpoints but turn off estimate change checkpoints
- **Set the debounce window** — if you make multiple changes quickly (e.g., adding 5 sub-tasks in a row), they'll be grouped into a single checkpoint instead of creating 5

Default settings: all auto-checkpoints on, 30-minute debounce window.

## Understanding Your Estimation Accuracy

### The Two Error Types

When you complete a task, the app decomposes your estimation error:

**Scope Error** — time spent on tasks that weren't in your original plan.

- Example: You planned 3 sub-tasks but ended up doing 5. The extra 2 sub-tasks are scope error.
- This suggests: you need better upfront planning or discovery.

**Effort Error** — overrun on tasks that were in your original plan.

- Example: You estimated "Build Login Page" at 2 hours but it took 3. That extra hour is effort error.
- This suggests: you need to pad estimates or break tasks down further.

### Example

You create "Build Auth System" and plan:

- Login Page: 2h estimate
- Signup Page: 2h estimate
- Session Management: 2h estimate
- **Total plan: 6h**

You start working. During work, you realize you also need:

- Password Reset: 1.5h actual
- Rate Limiting: 1h actual

And the original tasks take longer:

- Login Page: 3h actual (1h over)
- Signup Page: 2.5h actual (0.5h over)
- Session Management: 2h actual (on target)

**Final: 10h actual vs 6h estimated = 4h overrun**

The app decomposes this:

- **Scope error: 2.5h** (Password Reset + Rate Limiting — tasks you didn't plan for)
- **Effort error: 1.5h** (Login + Signup overruns — tasks you underestimated)
- **Conclusion**: 62% of your overrun was scope, 38% was effort

Over time, these patterns help you estimate better.

## Todos

### Adding Todos

On any task, you can add a checklist of todo items. Each todo has text, a checkbox, and an optional time estimate. Use estimates on todos to get a rough sense of total effort before committing to full sub-tasks.

### Converting Todos to Sub-Tasks

When you're ready to track time on a todo item, convert it to a sub-task. The conversion:

- Uses the todo's text as the sub-task title
- Carries over the todo's estimate (if set)
- Lets you add a category

The new sub-task becomes a full trackable task. If you've already started working (baseline exists), this triggers a scope change checkpoint — just like adding any other sub-task.

## Optional: Toggl Integration

If you use Toggl Track, you can connect the app to your Toggl account:

1. Go to Settings
2. Enter your Toggl API token (from your Toggl profile)
3. Select your workspace

Each user manages their own Toggl connection — there's no shared Toggl configuration.

With Toggl connected, you can:

- Link tasks to Toggl tags
- Import time entries from Toggl
- Push tasks as Toggl tags

The app works fully without Toggl. The integration is entirely optional.
