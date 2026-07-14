import { Prisma, TaskEventType } from "@prisma/client";
import { z } from "zod";

// Payload schema per TaskEventType. Shapes come from the #23 grill (2026-07-14),
// ADR-0020, and the wiring tickets #51-#55. The `satisfies Record<TaskEventType, …>`
// below keeps this map exhaustive: a new enum value won't compile until it has a
// schema here.

// Timestamps enter as Date (callers hold Date objects) but are stored as ISO-8601
// strings, so the ledger stays plain, tool-agnostic JSON. (A raw Date in a Prisma
// Json field is persisted as a `{ $type: "DateTime", value }` wrapper — unwanted
// noise in an audit record read later by the analysis code.)
const timestamp = z.date().transform((d) => d.toISOString());

// Hierarchy transition verbs (complete/uncomplete/archive/unarchive/delete/restore).
// One event per affected task, same type for direct act and cascade; `causedBy`
// distinguishes them (ADR-0020).
const statusTransitionPayload = z.object({
  at: timestamp, // when the transition happened
  causedBy: z.string().optional(), // set only on cascaded events: the task the direct act targeted
});

const subtaskPayload = z.object({
  childTaskId: z.string(),
  childTitle: z.string(),
});

// Provisional/dormant event types: no call sites yet, payloads re-grilled in
// Iterations 3/4 (#23). Permissive object shape until then.
const provisionalPayload = z.record(z.string(), z.unknown());

const eventPayloadSchemas = {
  [TaskEventType.CREATED]: z.object({
    title: z.string(),
    estimate: z.number().int().optional(),
    parentId: z.string().optional(),
  }),
  [TaskEventType.STARTED]: z.object({
    startedAt: timestamp,
  }),
  [TaskEventType.COMPLETED]: statusTransitionPayload,
  [TaskEventType.UNCOMPLETED]: statusTransitionPayload,
  [TaskEventType.ARCHIVED]: statusTransitionPayload,
  [TaskEventType.UNARCHIVED]: statusTransitionPayload,
  [TaskEventType.DELETED]: statusTransitionPayload,
  [TaskEventType.RESTORED]: statusTransitionPayload,
  // Set/clear both expressed through nulls; a task born with an estimate is covered
  // by CREATED alone, so this fires only on a later change (#51).
  [TaskEventType.ESTIMATE_CHANGED]: z.object({
    old: z.number().int().nullable(),
    new: z.number().int().nullable(),
  }),
  [TaskEventType.SUBTASK_CREATED]: subtaskPayload,
  [TaskEventType.SUBTASK_REMOVED]: subtaskPayload,
  // Before/after tag-id sets (Tag.id is Int), enough to see the change (#53).
  [TaskEventType.TAGS_CHANGED]: z.object({
    old: z.array(z.number().int()),
    new: z.array(z.number().int()),
  }),
  [TaskEventType.TODO_ADDED]: provisionalPayload,
  [TaskEventType.TODO_CONVERTED]: provisionalPayload,
  [TaskEventType.TODO_COMPLETED]: provisionalPayload,
  [TaskEventType.CHECKPOINT_CREATED]: provisionalPayload,
} satisfies Record<TaskEventType, z.ZodType>;

type EventPayloadSchemas = typeof eventPayloadSchemas;

/**
 * Input to {@link emitEvent}. Discriminated on `type`: the event type pins the
 * required `payload` shape, so a wiring service that passes the wrong payload for a
 * type is a compile error, not just a runtime one.
 */
export type EmitEventInput = {
  [T in TaskEventType]: {
    taskId: string;
    userId: string; // the acting user (actor)
    type: T;
    payload: z.input<EventPayloadSchemas[T]>;
  };
}[TaskEventType];

/**
 * Append a row to the TaskEvent audit ledger (CONTEXT.md → TaskEvent).
 *
 * Validates `payload` against the schema for its `type` — throwing a
 * {@link z.ZodError} on a bad shape before any write — then inserts through the
 * caller-supplied transaction client `tx`. Because the insert rides the caller's
 * transaction, a failure here rolls back the caller's mutation, and a failure in
 * the caller after this call rolls the event back too.
 */
export async function emitEvent(
  tx: Prisma.TransactionClient,
  { taskId, userId, type, payload }: EmitEventInput,
) {
  const validatedPayload = eventPayloadSchemas[type].parse(payload);
  return tx.taskEvent.create({
    data: {
      taskId,
      userId,
      eventType: type,
      // Validated above; the cast bridges Zod's output type to Prisma's Json input.
      payload: validatedPayload as unknown as Prisma.InputJsonValue,
    },
  });
}
