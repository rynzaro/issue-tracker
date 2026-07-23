---
status: partially superseded by ADR-0019
---

# Authorization is the action layer's responsibility

**Context:** Service functions are internal utilities that may appear to lack userId scoping or authorization checks (e.g., `getProjectById` exported but only called from other services; `getTimeEntriesForTask` doesn't filter by userId in the query).

**Decision:** Authorization and user scoping are exclusively the responsibility of the **action layer** and **server components**. Service functions are internal building blocks that assume the caller has already verified permissions.

**Rationale:**

- **Single point of control**: Auth checks happen once at the entry point (Server Action or Server Component), not scattered across service functions.
- **Composability**: Services can call other services without repetitive auth checks. Internal functions (e.g., `getProjectById`) can be used by other services without requiring userId everywhere.
- **Session access**: Only actions and server components have access to `auth()` session context. Services remain pure data layer functions.
- **Clear boundary**: The action layer is the security boundary. Everything below it (services, Prisma) operates on pre-validated, pre-authorized data.

**Pattern:**

```typescript
// ❌ NOT in service layer
export function getProjectById(projectId: string, userId: string) {
  // Don't check userId here
}

// ✅ In action layer
export async function getProjectAction(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Call service that verifies ownership
  return getUserProjectById({ userId: session.user.id, projectId });
}
```

**Consequences:** When reviewing service functions, the absence of authorization checks is **by design**, not a vulnerability. Always verify that the calling action or server component performs the auth check before invoking the service. *(Note: ADR-0019 retires this property — once the policy-module migration lands, services re-check authorization at their own boundary, and a missing `assertCan` in a service becomes a review finding.)*
