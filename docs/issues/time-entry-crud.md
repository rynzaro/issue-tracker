# Time Entry CRUD

> Feature spec for managing time entries — viewing, creating, editing, and deleting time entries, plus editing the running timer's start time.

## Motivation

Without editing time entries, a single forgotten timer corrupts all time data for the day. Users need to:

- Fix a timer they forgot to stop
- Correct a timer started late
- Manually add time tracked outside the app
- Delete accidental entries

## Decisions Made

| Decision                     | Choice                                                 | Rationale                                                                                                                       |
| ---------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Active timer — desktop       | Inside the navbar row                                  | Compact, always visible across all pages                                                                                        |
| Active timer — mobile        | Floating pill (bottom-right)                           | Minimal footprint, doesn't eat screen space                                                                                     |
| Timer idle state             | Hidden entirely                                        | No dead space; appears only when a timer starts                                                                                 |
| Start time editing (desktop) | Edit icon → expanding row below navbar                 | Clean separation: info in navbar, editing in dedicated space                                                                    |
| Start time editing (mobile)  | Pill expands in-place (upward)                         | No navigation, stays in context                                                                                                 |
| Past entries per task        | Dialog via ℹ️ button                                   | Matches existing dialog patterns (create/edit/delete)                                                                           |
| Start time edit interaction  | Click-to-edit                                          | Minimal, clean                                                                                                                  |
| Time input component         | Separate `<input type="date">` + `<input type="time">` | Prevents invalid input by design, allows any datetime including past. Replaceable later per roadmap ("different time selector") |
| Entry CRUD scope             | All four operations (show, create, edit, delete)       | Full CRUD in first pass                                                                                                         |

## UI Spec

### 1. Active Timer — Desktop (lg+)

Inside the navbar row, in the spacer area. Only visible when a timer is running.

```
┌──────────────────────────────────────────────────────────────────────┐
│  OnTrack ▾ │ Home │     🔴 Design API — 02:14:30  [✏] [⏹]  user@ ▾ │
└──────────────────────────────────────────────────────────────────────┘
```

- **🔴** Pulsing dot (reuse `animate-pulse-dot`)
- **Task name** — truncated if long
- **Elapsed time** — live-ticking HH:MM:SS
- **✏ Edit button** — small, clearly indicates editability
- **⏹ Stop button**

Clicking **✏** slides open a row below the navbar:

```
┌──────────────────────────────────────────────────────────────────────┐
│  OnTrack ▾ │ Home │     🔴 Design API — 02:14:30  [✏] [⏹]  user@ ▾ │
├──────────────────────────────────────────────────────────────────────┤
│  Startzeit:  [____2026-03-03____]  [__14:32__]           [Speichern]│
└──────────────────────────────────────────────────────────────────────┘
```

- Two native inputs: date + time
- Save button confirms, collapses the row
- No extra information — just the start time, minimal

### 2. Active Timer — Mobile (<lg)

Floating pill in bottom-right corner. Only visible when a timer is running.

**Collapsed:**

```
              ┌──────────┐
              │ 🔴 02:14 │
              └──────────┘
```

**Expanded (tap to expand upward):**

```
        ┌─────────────────────┐
        │ Design API          │
        │ 02:14:30            │
        │ Start: [date] [time]│
        │       [Speichern]   │
        │            [⏹ Stop] │
        └─────────────────────┘
```

### 3. Time Entry Dialog (per-task, ℹ️ button)

Triggered by the existing **ℹ️ InformationCircleIcon** button on each task row. Opens a standard dialog.

```
┌─ Zeiteinträge für "Design API" ──────────────────────┐
│                                                       │
│  Datum       Start   Ende    Dauer       Aktionen     │
│  03.03.2026  09:00   10:30   01:30:00    [✏] [🗑]    │
│  02.03.2026  14:00   15:45   01:45:00    [✏] [🗑]    │
│  01.03.2026  08:30   09:00   00:30:00    [✏] [🗑]    │
│                                                       │
│  [+ Manuellen Eintrag erstellen]                      │
│                                                       │
│                                          [Schließen]  │
└───────────────────────────────────────────────────────┘
```

- **List**: All `TimeEntry` records for that task, sorted by date descending
- **Edit** (✏): Inline row with date + time inputs for start and end
- **Delete** (🗑): Confirmation, then remove
- **Create**: Button opens inline form with date + start time + end time

### 4. Reusable Start Time Input

Two native inputs (`<input type="date">` + `<input type="time">`) used across:

- Navbar edit row (editing running timer start)
- Mobile pill expanded view
- Time entry dialog (edit and create flows)

Any valid datetime allowed, including past dates. To be replaced with a custom picker in the future.

## Data Flow

| Component         | Source                                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Navbar timer      | `getActiveTimeEntryForUser()` fetched in `app/s/layout.tsx` (server), passed to client `<ActiveTimerNavbar>`. Ticking via `useElapsedTimer` hook. |
| Mobile pill       | Same data, same client component, responsive CSS to toggle layout.                                                                                |
| Time entry dialog | Entry list loaded on dialog open via server action.                                                                                               |

## Implementation Tasks

### Backend (service + action layer)

- [ ] Complete `changeActiveTimeEntryStart()` in `lib/services/activeTask.service.ts` (currently half-written)
- [ ] Add `changeActiveTimerStartAction()` in `lib/actions/timeEntry.actions.ts`
- [ ] Add `getTimeEntriesForTask()` in `lib/services/timeEntry.service.ts`
- [ ] Add `createManualTimeEntry()` in `lib/services/timeEntry.service.ts`
- [ ] Add `updateTimeEntry()` in `lib/services/timeEntry.service.ts`
- [ ] Add `deleteTimeEntry()` in `lib/services/timeEntry.service.ts`
- [ ] Add corresponding server actions in `lib/actions/timeEntry.actions.ts`
- [ ] Add Zod schemas in `lib/schema/timeEntry.ts` (CreateManualTimeEntrySchema, UpdateTimeEntrySchema)

### Frontend — Active Timer (navbar + mobile pill)

- [ ] Create `<ActiveTimerNavbar>` client component (navbar inline display)
- [ ] Fetch active timer data in `app/s/layout.tsx`, pass to `NavbarApp`
- [ ] Wire edit button → expanding row below navbar with date + time inputs
- [ ] Wire stop button → `stopTimeEntryAction()`
- [ ] Wire save → `changeActiveTimerStartAction()`
- [ ] Create `<ActiveTimerPill>` client component (mobile floating pill)
- [ ] Collapsed state: pulsing dot + elapsed time
- [ ] Expanded state: task name + elapsed + start time editing + stop
- [ ] Hide both components when no timer is running

### Frontend — Time Entry Dialog

- [ ] Wire ℹ️ button in `tasks.tsx` to open time entry dialog
- [ ] Add dialog state management in `tasksWrapper.tsx` (same pattern as create/edit/delete)
- [ ] Entry list view (sorted by date desc, showing start/end/duration)
- [ ] Edit entry inline (date + time inputs for start and end)
- [ ] Delete entry with confirmation
- [ ] Create manual entry form (date + start + end inputs)
- [ ] Recalculate duration on save (from start/end times)

### Shared

- [ ] Build reusable `<DateTimeInput>` component (date input + time input pair)
- [ ] Validation: end must be after start, duration auto-computed

## Files Touched

| File                                          | Change                                |
| --------------------------------------------- | ------------------------------------- |
| `lib/services/activeTask.service.ts`          | Complete `changeActiveTimeEntryStart` |
| `lib/services/timeEntry.service.ts`           | Add CRUD functions                    |
| `lib/actions/timeEntry.actions.ts`            | Add CRUD actions                      |
| `lib/schema/timeEntry.ts`                     | Add Zod schemas                       |
| `components/navbar-app.tsx`                   | Accept + render active timer data     |
| `app/s/layout.tsx`                            | Fetch active timer, pass to navbar    |
| `app/s/project/[project-id]/tasks.tsx`        | Wire ℹ️ button to dialog              |
| `app/s/project/[project-id]/tasksWrapper.tsx` | Add time entry dialog state           |
| New: `components/active-timer-navbar.tsx`     | Desktop active timer component        |
| New: `components/active-timer-pill.tsx`       | Mobile floating pill component        |
| New: `components/datetime-input.tsx`          | Reusable date + time input pair       |
| New: `components/time-entry-dialog.tsx`       | Time entry list + CRUD dialog         |

## Open Questions

- Should editing an entry's times trigger `revalidatePath` on the project page (to update totals in the task tree)? → Likely yes.
- Should the time entry dialog also show the currently running timer as a special "in progress" row? → Nice to have, not required for v1.
