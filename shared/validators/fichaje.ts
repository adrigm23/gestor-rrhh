import { z } from "zod";

export const FichajeEntryDtoSchema = z.object({
  id: z.string(),
  tipo: z.enum(["JORNADA", "PAUSA_COMIDA"]),
  entrada: z.string().datetime(),
  salida: z.string().datetime().nullable(),
});
export type FichajeEntryDto = z.infer<typeof FichajeEntryDtoSchema>;

const ApprovedLeaveTypeSchema = z.enum(["VACACIONES", "AUSENCIA"]);

export const ToggleFichajeRequestSchema = z
  .object({
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  })
  .refine((v) => (v.latitude === undefined) === (v.longitude === undefined), {
    message: "latitude and longitude must be provided together",
  });
export type ToggleFichajeRequest = z.infer<typeof ToggleFichajeRequestSchema>;

export const ToggleFichajeResponseSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("blocked-by-leave"), leaveType: ApprovedLeaveTypeSchema }),
  z.object({ outcome: z.literal("started"), shift: FichajeEntryDtoSchema }),
  z.object({
    outcome: z.literal("stopped"),
    shift: FichajeEntryDtoSchema,
    closedPause: FichajeEntryDtoSchema.nullable(),
  }),
]);
export type ToggleFichajeResponse = z.infer<typeof ToggleFichajeResponseSchema>;

export const TogglePausaResponseSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("blocked-by-leave"), leaveType: ApprovedLeaveTypeSchema }),
  z.object({ outcome: z.literal("no-active-shift") }),
  z.object({ outcome: z.literal("started"), pause: FichajeEntryDtoSchema }),
  z.object({ outcome: z.literal("stopped"), pause: FichajeEntryDtoSchema }),
]);
export type TogglePausaResponse = z.infer<typeof TogglePausaResponseSchema>;

export const ClockStatusDtoSchema = z.object({
  shift: FichajeEntryDtoSchema.nullable(),
  pause: FichajeEntryDtoSchema.nullable(),
  blockedByLeave: ApprovedLeaveTypeSchema.nullable(),
  pauseAccumulatedMs: z.number(),
});
export type ClockStatusDto = z.infer<typeof ClockStatusDtoSchema>;

// A diferencia de FichajeEntryDtoSchema (solo JORNADA/PAUSA_COMIDA, lo único
// que la app puede crear), el historial puede incluir fichajes de tipos que
// solo un gestor crea manualmente (DESCANSO/MEDICO).
export const FichajeHistoryEntryDtoSchema = z.object({
  id: z.string(),
  tipo: z.enum(["JORNADA", "PAUSA_COMIDA", "DESCANSO", "MEDICO"]),
  entrada: z.string().datetime(),
  salida: z.string().datetime().nullable(),
  editado: z.boolean(),
});
export type FichajeHistoryEntryDto = z.infer<typeof FichajeHistoryEntryDtoSchema>;

export const ListFichajeHistoryResponseSchema = z.object({
  historial: z.array(FichajeHistoryEntryDtoSchema),
});
export type ListFichajeHistoryResponse = z.infer<typeof ListFichajeHistoryResponseSchema>;
