import { z } from "zod";

export const SolicitudDtoSchema = z.object({
  id: z.string(),
  tipo: z.enum(["VACACIONES", "AUSENCIA"]),
  estado: z.enum(["PENDIENTE", "APROBADA", "RECHAZADA", "ANULADA"]),
  inicio: z.string().datetime(),
  fin: z.string().datetime().nullable(),
  motivo: z.string().nullable(),
  ausenciaTipo: z.enum(["FALTA", "AVISO"]).nullable(),
  createdAt: z.string().datetime(),
});
export type SolicitudDto = z.infer<typeof SolicitudDtoSchema>;

// Fechas en formato "AAAA-MM-DD" (sin hora), igual que el <input type="date">
// del formulario web — se resuelven a medianoche local en el servidor.
const DateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");

export const CreateSolicitudRequestSchema = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("VACACIONES"),
    inicio: DateOnlySchema,
    fin: DateOnlySchema.optional(),
    motivo: z.string().max(2000).optional(),
  }),
  z.object({
    tipo: z.literal("AUSENCIA"),
    inicio: DateOnlySchema,
    fin: DateOnlySchema.optional(),
    motivo: z.string().max(2000).optional(),
    ausenciaTipo: z.enum(["FALTA", "AVISO"]),
  }),
]);
export type CreateSolicitudRequest = z.infer<typeof CreateSolicitudRequestSchema>;

export const CreateSolicitudResponseSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("ok"), solicitud: SolicitudDtoSchema }),
  z.object({ outcome: z.literal("overlap") }),
  z.object({ outcome: z.literal("invalid-date-range"), message: z.string() }),
]);
export type CreateSolicitudResponse = z.infer<typeof CreateSolicitudResponseSchema>;

export const ListSolicitudesResponseSchema = z.object({
  solicitudes: z.array(SolicitudDtoSchema),
});
export type ListSolicitudesResponse = z.infer<typeof ListSolicitudesResponseSchema>;

// Vista de gestor/admin: igual que SolicitudDto pero con datos del empleado
// solicitante (GERENTE ve solo su empresa; ADMIN_SISTEMA, todas).
export const SolicitudManagerDtoSchema = SolicitudDtoSchema.extend({
  usuarioNombre: z.string(),
  usuarioEmail: z.string(),
});
export type SolicitudManagerDto = z.infer<typeof SolicitudManagerDtoSchema>;

export const ListSolicitudesManagerResponseSchema = z.object({
  solicitudes: z.array(SolicitudManagerDtoSchema),
});
export type ListSolicitudesManagerResponse = z.infer<typeof ListSolicitudesManagerResponseSchema>;

export const UpdateSolicitudEstadoRequestSchema = z.object({
  estado: z.enum(["APROBADA", "RECHAZADA", "ANULADA"]),
});
export type UpdateSolicitudEstadoRequest = z.infer<typeof UpdateSolicitudEstadoRequestSchema>;

export const UpdateSolicitudEstadoResponseSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("ok") }),
  z.object({ outcome: z.literal("not-found") }),
  z.object({ outcome: z.literal("unauthorized") }),
  z.object({ outcome: z.literal("cannot-cancel-pending") }),
  z.object({ outcome: z.literal("invalid-transition") }),
  z.object({ outcome: z.literal("overlap") }),
]);
export type UpdateSolicitudEstadoResponse = z.infer<typeof UpdateSolicitudEstadoResponseSchema>;
