# Todos

> Iteration work lives in [ROADMAP.md](docs/ROADMAP.md). This file tracks cross-cutting improvements and ideas.

---

## Post-MVP Technical Improvements

Tackle after Iteration 1 ships. These are engineering quality investments, not user-facing features.

- [ ] **Zod-driven client validation** — Reuse `CreateTaskSchema` / `UpdateTaskSchema` on the client (via `safeParse`) instead of duplicating validation rules in `useTaskForm.validateForm()`. Single source of truth for field rules. Consider `react-hook-form` + `zodResolver` if form count grows beyond 3-4.
- [ ] **Shared `TaskFormFields` component** — Extract the duplicated field markup (title + estimatedDuration + description + error display) from `newRootTask.tsx` and `tasksWrapper.tsx` (3 copies total) into a single `TaskFormFields` component that takes `values` + `setValues` props.
- [ ] **Multi-user test fixtures** — Seed 2 users with overlapping projects/tasks. Run every service mutation as user A, assert user B's data is untouched. Catches data isolation bugs (like the `deleteMany: {}` scope leak) in CI before they ship.
- [ ] **Auto-generated schema docs** — Generate the "Target Schema" section in ROADMAP.md from `prisma/schema.prisma` (e.g. a script or Prisma generator). Eliminates doc drift — the schema in docs and the actual schema can never diverge.

---

## UX Ideas

Captured from earlier brainstorming. Prioritize when relevant.

- [ ] Notification system (success/error toasts after mutations)
- [ ] Default project functionality (auto-select on login)
- [ ] Project selection architecture (navbar dropdown vs sidebar vs dedicated page)
- [ ] Button hover explanations (tooltips)
- [ ] Estimated duration input — explore scroll/stepper input instead of plain text field
