import z from "zod";

export const CreateProjectSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(1000).optional(),
  projectSettings: z
    .object({
      autoCheckpointsEnabled: z.boolean(),
      autoCheckpointOnScopeChange: z.boolean(),
      autoCheckpointOnEstimateChange: z.boolean(),
      checkpointDebounceMinutes: z.number().int().min(0).max(1440),
    })
    .optional(),
});

export type CreateProjectParams = z.infer<typeof CreateProjectSchema>;
