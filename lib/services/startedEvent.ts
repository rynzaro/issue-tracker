import { Prisma, TaskEventType } from "@prisma/client";
import { emitEvent } from "./event.service";

/**
 * Emit a write-once STARTED event marking a task's first work (#23/#55).
 *
 * Skips the emit when the ledger already holds a STARTED for the task, so later
 * timers or manual entries — even backdated ones — never move or duplicate it:
 * corrections live in state, not in past events (#23).
 *
 * Runs on the caller's transaction client, so the guard read and the insert
 * commit (or roll back) together with the caller's mutation. Note the guard is
 * best-effort under concurrency: without a unique constraint on
 * (taskId, eventType), two transactions racing on the same task could each see
 * "no prior STARTED" and both insert. Acceptable single-user; a partial unique
 * index would close it if that ever matters.
 *
 * Belongs conceptually in event.service.ts; kept separate while #51–#55 land in
 * parallel so that shared file stays untouched.
 */
export async function emitStartedOnce(
  tx: Prisma.TransactionClient,
  {
    taskId,
    userId,
    startedAt,
  }: { taskId: string; userId: string; startedAt: Date },
) {
  const priorStarted = await tx.taskEvent.findFirst({
    where: { taskId, eventType: TaskEventType.STARTED },
    select: { id: true },
  });
  if (priorStarted) return null;

  return emitEvent(tx, {
    taskId,
    userId,
    type: TaskEventType.STARTED,
    payload: { startedAt },
  });
}
