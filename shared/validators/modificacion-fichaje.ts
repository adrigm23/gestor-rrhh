import { z } from "zod";

export const SolicitudModificacionFichajeDtoSchema = z.object({
  id: z.string(),
  solicitanteNombre: z.string(),
  solicitanteEmail: z.string(),
  fichajeEntrada: z.string().datetime().nullable(),
  fichajeSalida: z.string().datetime().nullable(),
  entradaPropuesta: z.string().datetime().nullable(),
  salidaPropuesta: z.string().datetime().nullable(),
  motivo: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type SolicitudModificacionFichajeDto = z.infer<typeof SolicitudModificacionFichajeDtoSchema>;

export const ListModificacionesFichajeResponseSchema = z.object({
  solicitudes: z.array(SolicitudModificacionFichajeDtoSchema),
});
export type ListModificacionesFichajeResponse = z.infer<typeof ListModificacionesFichajeResponseSchema>;

export const RespondModificacionFichajeRequestSchema = z.object({
  accion: z.enum(["ACEPTADA", "RECHAZADA"]),
});
export type RespondModificacionFichajeRequest = z.infer<typeof RespondModificacionFichajeRequestSchema>;

export const RespondModificacionFichajeResponseSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("ok") }),
  z.object({ outcome: z.literal("not-found") }),
  z.object({ outcome: z.literal("already-responded") }),
  z.object({ outcome: z.literal("no-hours-proposed") }),
  z.object({ outcome: z.literal("entrada-required-for-update") }),
  z.object({ outcome: z.literal("entrada-required-for-create") }),
  z.object({ outcome: z.literal("invalid-range") }),
  z.object({ outcome: z.literal("overlap") }),
]);
export type RespondModificacionFichajeResponse = z.infer<typeof RespondModificacionFichajeResponseSchema>;

// --- Creación por GERENTE/ADMIN_SISTEMA (Fase 2.11) ---

export const FichajeOptionDtoSchema = z.object({
  id: z.string(),
  entrada: z.string().datetime(),
  salida: z.string().datetime().nullable(),
});
export type FichajeOptionDto = z.infer<typeof FichajeOptionDtoSchema>;

export const ListFichajesForEmpleadoResponseSchema = z.object({
  fichajes: z.array(FichajeOptionDtoSchema),
});
export type ListFichajesForEmpleadoResponse = z.infer<typeof ListFichajesForEmpleadoResponseSchema>;

// A diferencia del formulario web (datetime-local + tzOffset del
// navegador), el móvil resuelve la fecha/hora localmente y envía ISO ya
// resuelto — sin necesidad de reproducir ese cálculo de offset en el
// backend.
export const CreateModificacionFichajeRequestSchema = z
  .object({
    empleadoId: z.string().min(1),
    fichajeId: z.string().min(1).optional(),
    entrada: z.string().datetime().optional(),
    salida: z.string().datetime().optional(),
    motivo: z.string().max(2000).optional(),
  })
  .refine((v) => v.entrada !== undefined || v.salida !== undefined, {
    message: "Indica al menos una hora",
    path: ["entrada"],
  });
export type CreateModificacionFichajeRequest = z.infer<typeof CreateModificacionFichajeRequestSchema>;

export const CreateModificacionFichajeResponseSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("ok") }),
  z.object({ outcome: z.literal("invalid-employee") }),
  z.object({ outcome: z.literal("employee-out-of-scope") }),
  z.object({ outcome: z.literal("invalid-fichaje") }),
]);
export type CreateModificacionFichajeResponse = z.infer<typeof CreateModificacionFichajeResponseSchema>;

export const SolicitudModificacionManagerDtoSchema = z.object({
  id: z.string(),
  empleadoNombre: z.string(),
  empleadoEmail: z.string(),
  estado: z.enum(["PENDIENTE", "ACEPTADA", "RECHAZADA"]),
  entradaPropuesta: z.string().datetime().nullable(),
  salidaPropuesta: z.string().datetime().nullable(),
  motivo: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type SolicitudModificacionManagerDto = z.infer<typeof SolicitudModificacionManagerDtoSchema>;

export const ListModificacionesManagerResponseSchema = z.object({
  solicitudes: z.array(SolicitudModificacionManagerDtoSchema),
});
export type ListModificacionesManagerResponse = z.infer<typeof ListModificacionesManagerResponseSchema>;
