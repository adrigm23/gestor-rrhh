import { z } from "zod";

export const EmpresaEntryDtoSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  cif: z.string(),
  pausaCuentaComoTrabajo: z.boolean(),
  geolocalizacionFichaje: z.boolean(),
  createdAt: z.string().datetime(),
  usuariosCount: z.number(),
  departamentosCount: z.number(),
  centrosTrabajoCount: z.number(),
});
export type EmpresaEntryDto = z.infer<typeof EmpresaEntryDtoSchema>;

export const ListEmpresasAdminResponseSchema = z.object({
  empresas: z.array(EmpresaEntryDtoSchema),
});
export type ListEmpresasAdminResponse = z.infer<typeof ListEmpresasAdminResponseSchema>;

export const CrearEmpresaRequestSchema = z.object({
  nombre: z.string().trim().min(1).max(200),
  // Misma regla que la web: se normaliza a mayúsculas y se exige un
  // mínimo de 6 caracteres.
  cif: z.string().trim().min(6).max(20),
});
export type CrearEmpresaRequest = z.infer<typeof CrearEmpresaRequestSchema>;

export const CrearEmpresaResponseSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("ok") }),
  z.object({ outcome: z.literal("cif-duplicado") }),
  z.object({ outcome: z.literal("nombre-duplicado") }),
]);
export type CrearEmpresaResponse = z.infer<typeof CrearEmpresaResponseSchema>;

export const EliminarEmpresaResponseSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("ok") }),
  z.object({ outcome: z.literal("not-found") }),
  z.object({ outcome: z.literal("has-admins") }),
  z.object({ outcome: z.literal("has-blockers") }),
]);
export type EliminarEmpresaResponse = z.infer<typeof EliminarEmpresaResponseSchema>;

export const ActualizarConfigEmpresaRequestSchema = z.object({
  pausaCuentaComoTrabajo: z.boolean(),
  geolocalizacionFichaje: z.boolean(),
});
export type ActualizarConfigEmpresaRequest = z.infer<typeof ActualizarConfigEmpresaRequestSchema>;

export const ActualizarConfigEmpresaResponseSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("ok") }),
  z.object({ outcome: z.literal("not-found") }),
  z.object({ outcome: z.literal("forbidden") }),
]);
export type ActualizarConfigEmpresaResponse = z.infer<typeof ActualizarConfigEmpresaResponseSchema>;

export const MiEmpresaConfigDtoSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  pausaCuentaComoTrabajo: z.boolean(),
  geolocalizacionFichaje: z.boolean(),
});
export type MiEmpresaConfigDto = z.infer<typeof MiEmpresaConfigDtoSchema>;

export const GetMiEmpresaConfigResponseSchema = z.object({
  empresa: MiEmpresaConfigDtoSchema.nullable(),
});
export type GetMiEmpresaConfigResponse = z.infer<typeof GetMiEmpresaConfigResponseSchema>;

// --- Cambiar la empresa de un usuario (pendiente desde la 2.13) ---

export const CambiarEmpresaUsuarioRequestSchema = z.object({
  empresaId: z.string().min(1),
});
export type CambiarEmpresaUsuarioRequest = z.infer<typeof CambiarEmpresaUsuarioRequestSchema>;

export const CambiarEmpresaUsuarioResponseSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("ok") }),
  z.object({ outcome: z.literal("not-found") }),
  z.object({ outcome: z.literal("forbidden-target") }),
  z.object({ outcome: z.literal("invalid-empresa") }),
]);
export type CambiarEmpresaUsuarioResponse = z.infer<typeof CambiarEmpresaUsuarioResponseSchema>;
