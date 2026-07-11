# Soft delete with app-level cascade

Soft delete with application-level cascade. Setting `deletedAt` on a task recursively sets `deletedAt` on all descendants via service code (not DB cascades — see ADR-0010). All queries filter `deletedAt IS NULL`. No restore functionality. Projects also use soft delete (set `deletedAt`, filter from queries).

**Rationale:** Cascade deletion maintains tree integrity and prevents orphaned tasks that would complicate UI logic. Children with `parentId` pointing to a deleted parent would become invisible in tree-building (not pushed to parent's children array, not pushed to roots). Cascading ensures consistent tree state.

**Implementation:** Service layer collects all descendant IDs via BFS/DFS, then `updateMany({ where: { id: { in: [taskId, ...descendantIds] } }, data: { deletedAt: new Date() } })`.
