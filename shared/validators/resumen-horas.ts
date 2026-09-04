import { z } from "zod";

export const FichajeTramoDtoSchema = z.object({
  id: z.string(),
  entrada: z.string().datetime(),
  salida: z.string().datetime().nullable(),
  tipo: z.enum(["JORNADA", "PAUSA_COMIDA", "DESCANSO", "MEDICO"]),
  durationMs: z.number(),
});
export type FichajeTramoDto = z.infer<typeof FichajeTramoDtoSchema>;

export const ResumenHorasDtoSchema = z.object({
  empleadoNombre: z.string(),
  empleadoEmail: z.string(),
  empresaNombre: z.string().nullable(),
  pausaCuentaComoTrabajo: z.boolean(),
  rangeStart: z.string().datetime(),
  rangeEnd: z.string().datetime(),
  totalMs: z.number(),
  contratoHorasSemanales: z.number().nullable(),
  contratoDesde: z.string().datetime().nullable(),
  progresoPercent: z.number().nullable(),
  fichajes: z.array(FichajeTramoDtoSchema),
});
export type ResumenHorasDto = z.infer<typeof ResumenHorasDtoSchema>;

export const GetResumenHorasResponseSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("ok"), data: ResumenHorasDtoSchema }),
  z.object({ outcome: z.literal("no-empresa") }),
  z.object({ outcome: z.literal("empleado-not-found") }),
]);
export type GetResumenHorasResponse = z.infer<typeof GetResumenHorasResponseSchema>;
