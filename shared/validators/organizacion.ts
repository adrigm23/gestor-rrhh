import { z } from "zod";

export const CentroTrabajoEntryDtoSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  direccion: z.string().nullable(),
  gerenteNombre: z.string().nullable(),
  empresaNombre: z.string().nullable(),
  departamentosCount: z.number(),
});
export type CentroTrabajoEntryDto = z.infer<typeof CentroTrabajoEntryDtoSchema>;

export const ListCentrosResponseSchema = z.object({
  centros: z.array(CentroTrabajoEntryDtoSchema),
});
export type ListCentrosResponse = z.infer<typeof ListCentrosResponseSchema>;

export const DepartamentoEntryDtoSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  gerenteNombre: z.string().nullable(),
  centroTrabajoNombre: z.string().nullable(),
  empresaNombre: z.string().nullable(),
  empleadosCount: z.number(),
});
export type DepartamentoEntryDto = z.infer<typeof DepartamentoEntryDtoSchema>;

export const ListDepartamentosOrgResponseSchema = z.object({
  departamentos: z.array(DepartamentoEntryDtoSchema),
});
export type ListDepartamentosOrgResponse = z.infer<typeof ListDepartamentosOrgResponseSchema>;

export const GerenteOptionDtoSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  email: z.string(),
  empresaNombre: z.string().nullable(),
});
export type GerenteOptionDto = z.infer<typeof GerenteOptionDtoSchema>;

export const ListGerentesOptionsResponseSchema = z.object({
  gerentes: z.array(GerenteOptionDtoSchema),
});
export type ListGerentesOptionsResponse = z.infer<typeof ListGerentesOptionsResponseSchema>;

// --- Crear centro de trabajo (GERENTE en su empresa, ADMIN_SISTEMA eligiendo empresa) ---

export const CrearCentroTrabajoRequestSchema = z.object({
  nombre: z.string().trim().min(1).max(200),
  gerenteId: z.string().min(1).optional(),
  direccion: z.string().trim().max(500).optional(),
  empresaId: z.string().min(1).optional(),
});
export type CrearCentroTrabajoRequest = z.infer<typeof CrearCentroTrabajoRequestSchema>;

export const CrearCentroTrabajoResponseSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("ok") }),
  z.object({ outcome: z.literal("empresa-requerida") }),
  z.object({ outcome: z.literal("gerente-invalido") }),
  z.object({ outcome: z.literal("nombre-duplicado") }),
]);
export type CrearCentroTrabajoResponse = z.infer<typeof CrearCentroTrabajoResponseSchema>;

// --- Crear departamento (mismo alcance de rol/empresa que centros) ---

export const CrearDepartamentoRequestSchema = z.object({
  nombre: z.string().trim().min(1).max(200),
  gerenteId: z.string().min(1).optional(),
  centroTrabajoId: z.string().min(1).optional(),
  empresaId: z.string().min(1).optional(),
});
export type CrearDepartamentoRequest = z.infer<typeof CrearDepartamentoRequestSchema>;

export const CrearDepartamentoResponseSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("ok") }),
  z.object({ outcome: z.literal("empresa-requerida") }),
  z.object({ outcome: z.literal("gerente-invalido") }),
  z.object({ outcome: z.literal("centro-invalido") }),
  z.object({ outcome: z.literal("nombre-duplicado") }),
]);
export type CrearDepartamentoResponse = z.infer<typeof CrearDepartamentoResponseSchema>;

// --- Actualizar dirección de un centro ---

export const UpdateCentroDireccionRequestSchema = z.object({
  direccion: z.string().trim().max(500).optional(),
});
export type UpdateCentroDireccionRequest = z.infer<typeof UpdateCentroDireccionRequestSchema>;

export const UpdateCentroDireccionResponseSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("ok") }),
  z.object({ outcome: z.literal("not-found") }),
  z.object({ outcome: z.literal("out-of-scope") }),
]);
export type UpdateCentroDireccionResponse = z.infer<typeof UpdateCentroDireccionResponseSchema>;
