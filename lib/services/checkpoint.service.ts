import prisma from "@/lib/prisma";

// Checkpoint creation, snapshots, debounce, baseline (Iteration 3)

/**
 * Per-principal checkpoints (D-05 / ADR-0023).
 *
 * Every `Checkpoint` row carries `createdById` — the principal whose settled
 * judgement it records. A Task Member's plan/reality stream is separate from
 * the host owner's stream. When this module is implemented:
 *
 * - A `SCOPE_CHANGE` by a member under a host task writes the **member's** plan
 *   checkpoint on the host. The new child appears in the owner's parent
 *   cross-section only as a fact, not the owner's belief.
 * - A member's `WORK_STARTED` on their own subtask is the member's baseline;
 *   it does **not** close the host owner's plan debounce window.
 * - A member's `TASK_COMPLETED` on their own subtask fires a reality checkpoint
 *   on the host, authored by the member.
 *
 * The caller must supply the acting principal; the service must never default to
 * `project.userId` as the checkpoint author.
 */

export type Principal = { userId: string };

export type CheckpointTrigger =
  | "MANUAL"
  | "WORK_STARTED"
  | "SCOPE_CHANGE"
  | "ESTIMATE_CHANGE"
  | "TASK_COMPLETED";

// Placeholder: implementation deferred to Iteration 3. The schema is ready
// and the authorship rule above must govern any future implementation.
