## Today

- [ ] brevo integration

## UX Ideas

Captured from earlier brainstorming. Prioritize when relevant.

- [x] account creation — signup, login, logout all implemented
- [ ] forgot password flow — UI stub exists at `/public/forgot-password/`, needs backend (token generation, email sending via Brevo, reset completion)
- [x] stack projects in sidenavbar — switched to SidebarLayout with persistent desktop sidebar; projects listed as SidebarItems with active highlighting
- [ ] fix mobile version text sizes and buttons (thinking of a popup menu instead of buttons and just having start and stop visible, so the task + times can be large)
- [x] Deletion / Archiving architecture — both implemented: soft-delete (`deletedAt`) + archiving (`archivedAt`) with restore/unarchive, cascade behavior, and dedicated archive page
- [ ] Notification system — custom toast system in place (`toastProvider.tsx`), remaining: migrate inline errors to toasts in `create-project-form.tsx`, `updateProjectForm.tsx`, `deleteProjectSection.tsx`, `setDefaultButton.tsx`
- [x] Default project functionality (auto-select on login) — implemented: `/s/main` redirects to default project, star button on project header to set default
- [ ] User settings page — dedicated page or modal for per-user preferences (default project, notification prefs, display settings)
- [x] Project selection architecture — dropdown in navbar (desktop) + modal sidebar (mobile) implemented
- [ ] Button hover explanations (tooltips) — `Tooltip` component exists but only used in one place; icon buttons use `aria-label` instead of visible tooltips
- [ ] Estimated duration input — explore scroll/stepper input instead of plain text field
