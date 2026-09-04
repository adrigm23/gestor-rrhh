import { z } from "zod";

export const TipoFichajeSchema = z.enum(["JORNADA", "PAUSA_COMIDA", "DESCANSO", "MEDICO"]);
export type TipoFichajeValue = z.infer<typeof TipoFichajeSchema>;

export const FichajeEmpresaEntryDtoSchema = z.object({
  id: z.string(),
  empleadoNombre: z.string(),
  empleadoEmail: z.string(),
  empresaNombre: z.string().nullable(),
  entrada: z.string().datetime(),
  salida: z.string().datetime().nullable(),
  tipo: TipoFichajeSchema,
  editado: z.boolean(),
});
export type FichajeEmpresaEntryDto = z.infer<typeof FichajeEmpresaEntryDtoSchema>;

export const ListFichajesEmpresaResponseSchema = z.object({
  fichajes: z.array(FichajeEmpresaEntryDtoSchema),
  total: z.number(),
  canQuery: z.boolean(),
});
export type ListFichajesEmpresaResponse = z.infer<typeof ListFichajesEmpresaResponseSchema>;

export const EmpleadoPorEmpresaOptionDtoSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  email: z.string(),
});
export type EmpleadoPorEmpresaOptionDto = z.infer<typeof EmpleadoPorEmpresaOptionDtoSchema>;

export const ListEmpleadosPorEmpresaResponseSchema = z.object({
  empleados: z.array(EmpleadoPorEmpresaOptionDtoSchema),
});
export type ListEmpleadosPorEmpresaResponse = z.infer<typeof ListEmpleadosPorEmpresaResponseSchema>;

// --- Exportación asíncrona de CSV ---

export const CrearExportacionRequestSchema = z.object({
  tipo: z.enum(["FICHAJES", "FICHAJES_EMPRESAS"]),
  empresaId: z.string().min(1).optional(),
  empleadoId: z.string().min(1).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida").optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida").optional(),
  estado: z.enum(["abierto", "cerrado", "todos"]).optional(),
  tipoFiltro: z.enum(["JORNADA", "PAUSA_COMIDA", "DESCANSO", "MEDICO", "todos"]).optional(),
});
export type CrearExportacionRequest = z.infer<typeof CrearExportacionRequestSchema>;

export const CrearExportacionResponseSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("ok"), jobId: z.string() }),
  z.object({ outcome: z.literal("invalid-tipo") }),
  z.object({ outcome: z.literal("empresa-requerida") }),
  z.object({ outcome: z.literal("invalid-empresa") }),
  z.object({ outcome: z.literal("invalid-empleado") }),
  z.object({ outcome: z.literal("empleado-fuera-de-empresa") }),
]);
export type CrearExportacionResponse = z.infer<typeof CrearExportacionResponseSchema>;

export const ExportacionStatusResponseSchema = z.object({
  status: z.enum(["PENDIENTE", "GENERANDO", "LISTO", "ERROR"]),
  url: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
});
export type ExportacionStatusResponse = z.infer<typeof ExportacionStatusResponseSchema>;
