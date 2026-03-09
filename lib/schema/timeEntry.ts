import z from "zod";

// Allow 1-second grace period to avoid race conditions during typing/network delay
const notFutureDate = z.coerce
  .date()
  .refine((d) => d.getTime() <= Date.now() + 1000, {
    message: "Datum darf nicht in der Zukunft liegen",
  });

export const CreateManualTimeEntrySchema = z
  .object({
    taskId: z.cuid(),
    startedAt: notFutureDate,
    stoppedAt: notFutureDate,
  })
  .refine((data) => data.stoppedAt > data.startedAt, {
    message: "Endzeit muss nach Startzeit liegen",
    path: ["stoppedAt"],
  });

export type CreateManualTimeEntryParams = z.infer<
  typeof CreateManualTimeEntrySchema
>;

export const UpdateTimeEntrySchema = z
  .object({
    timeEntryId: z.cuid(),
    startedAt: notFutureDate,
    stoppedAt: notFutureDate,
  })
  .refine((data) => data.stoppedAt > data.startedAt, {
    message: "Endzeit muss nach Startzeit liegen",
    path: ["stoppedAt"],
  });

export type UpdateTimeEntryParams = z.infer<typeof UpdateTimeEntrySchema>;

export const GetTimeEntriesForTaskSchema = z.object({
  taskId: z.cuid(),
});

export type GetTimeEntriesForTaskParams = z.infer<
  typeof GetTimeEntriesForTaskSchema
>;

export const DeleteTimeEntrySchema = z.object({
  timeEntryId: z.cuid(),
});

export type DeleteTimeEntryParams = z.infer<typeof DeleteTimeEntrySchema>;
