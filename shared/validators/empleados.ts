import { z } from "zod";
import { PasswordPolicySchema } from "./common";

export const DirectoryEntryDtoSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  dni: z.string().nullable(),
  email: z.string(),
  rol: z.enum(["EMPLEADO", "GERENTE"]),
  activo: z.boolean(),
  fechaBaja: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  hasNfc: z.boolean(),
  passwordMustChange: z.boolean(),
  empresaId: z.string(),
  empresaNombre: z.string().nullable(),
  departamentoNombre: z.string().nullable(),
  contratoHorasSemanales: z.number().nullable(),
  contratoFechaInicio: z.string().datetime().nullable(),
});
export type DirectoryEntryDto = z.infer<typeof DirectoryEntryDtoSchema>;

export const ListDirectoryResponseSchema = z.object({
  usuarios: z.array(DirectoryEntryDtoSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type ListDirectoryResponse = z.infer<typeof ListDirectoryResponseSchema>;

export const GetEmpleadoDetailResponseSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("ok"), data: DirectoryEntryDtoSchema }),
  z.object({ outcome: z.literal("not-found") }),
]);
export type GetEmpleadoDetailResponse = z.infer<typeof GetEmpleadoDetailResponseSchema>;

export const DepartamentoOptionDtoSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  empresaId: z.string(),
  empresaNombre: z.string().nullable(),
});
export type DepartamentoOptionDto = z.infer<typeof DepartamentoOptionDtoSchema>;

export const ListDepartamentosOptionsResponseSchema = z.object({
  departamentos: z.array(DepartamentoOptionDtoSchema),
});
export type ListDepartamentosOptionsResponse = z.infer<typeof ListDepartamentosOptionsResponseSchema>;

export const EmpresaOptionDtoSchema = z.object({
  id: z.string(),
  nombre: z.string(),
});
export type EmpresaOptionDto = z.infer<typeof EmpresaOptionDtoSchema>;

export const ListEmpresasOptionsResponseSchema = z.object({
  empresas: z.array(EmpresaOptionDtoSchema),
});
export type ListEmpresasOptionsResponse = z.infer<typeof ListEmpresasOptionsResponseSchema>;

// --- Crear usuario (solo ADMIN_SISTEMA) ---

export const CreateUsuarioRequestSchema = z.object({
  nombre: z.string().trim().min(1).max(200),
  dni: z.string().trim().min(1).max(20),
  email: z.string().trim().toLowerCase().email(),
  password: PasswordPolicySchema,
  rol: z.enum(["EMPLEADO", "GERENTE"]),
  empresaId: z.string().min(1),
  departamentoId: z.string().min(1).optional(),
  // Obligatorias si rol="EMPLEADO" — se valida en la ruta, no aquí, igual
  // que hace la web (no encaja bien en un solo schema estático).
  horasSemanales: z.number().positive().max(60).optional(),
});
export type CreateUsuarioRequest = z.infer<typeof CreateUsuarioRequestSchema>;

export const CreateUsuarioResponseSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("ok") }),
  z.object({ outcome: z.literal("invalid-dni") }),
  z.object({ outcome: z.literal("email-taken") }),
  z.object({ outcome: z.literal("dni-taken") }),
  z.object({ outcome: z.literal("invalid-departamento") }),
]);
export type CreateUsuarioResponse = z.infer<typeof CreateUsuarioResponseSchema>;

// --- Acciones simples sobre un empleado (solo ADMIN_SISTEMA salvo donde se indique) ---

export const AdminTargetResponseSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("ok") }),
  z.object({ outcome: z.literal("not-found") }),
  z.object({ outcome: z.literal("forbidden-target") }),
]);
export type AdminTargetResponse = z.infer<typeof AdminTargetResponseSchema>;

export const ResetPasswordAdminRequestSchema = z.object({
  password: PasswordPolicySchema,
});
export type ResetPasswordAdminRequest = z.infer<typeof ResetPasswordAdminRequestSchema>;

export const UpdateEmailAdminRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});
export type UpdateEmailAdminRequest = z.infer<typeof UpdateEmailAdminRequestSchema>;

export const UpdateEmailAdminResponseSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("ok") }),
  z.object({ outcome: z.literal("not-found") }),
  z.object({ outcome: z.literal("forbidden-target") }),
  z.object({ outcome: z.literal("email-taken") }),
]);
export type UpdateEmailAdminResponse = z.infer<typeof UpdateEmailAdminResponseSchema>;

export const UpdateDniAdminRequestSchema = z.object({
  dni: z.string().trim().min(1).max(20),
});
export type UpdateDniAdminRequest = z.infer<typeof UpdateDniAdminRequestSchema>;

export const UpdateDniAdminResponseSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("ok") }),
  z.object({ outcome: z.literal("invalid-dni") }),
  z.object({ outcome: z.literal("not-found") }),
  z.object({ outcome: z.literal("forbidden-target") }),
  z.object({ outcome: z.literal("dni-taken") }),
]);
export type UpdateDniAdminResponse = z.infer<typeof UpdateDniAdminResponseSchema>;

export const UpdateEstadoRequestSchema = z.object({
  accion: z.enum(["baja", "reactivar"]),
});
export type UpdateEstadoRequest = z.infer<typeof UpdateEstadoRequestSchema>;

export const UpdateEstadoResponseSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("ok") }),
  z.object({ outcome: z.literal("self") }),
  z.object({ outcome: z.literal("not-found") }),
  z.object({ outcome: z.literal("forbidden-target") }),
  z.object({ outcome: z.literal("already-in-state") }),
]);
export type UpdateEstadoResponse = z.infer<typeof UpdateEstadoResponseSchema>;

export const EliminarUsuarioResponseSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("ok") }),
  z.object({ outcome: z.literal("not-found") }),
  z.object({ outcome: z.literal("forbidden-target") }),
  z.object({ outcome: z.literal("self") }),
  z.object({ outcome: z.literal("has-blockers"), blockers: z.array(z.string()) }),
]);
export type EliminarUsuarioResponse = z.infer<typeof EliminarUsuarioResponseSchema>;

// --- Crear/renovar contrato (ADMIN_SISTEMA + GERENTE en su empresa) ---

export const CrearContratoRequestSchema = z.object({
  empleadoId: z.string().min(1),
  horasSemanales: z.number().positive().max(60),
  // "AAAA-MM-DD", igual que el resto de fechas-sin-hora de este proyecto.
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida").optional(),
});
export type CrearContratoRequest = z.infer<typeof CrearContratoRequestSchema>;

export const CrearContratoResponseSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("ok") }),
  z.object({ outcome: z.literal("invalid-employee") }),
  z.object({ outcome: z.literal("employee-out-of-scope") }),
  z.object({ outcome: z.literal("invalid-start-date"), message: z.string() }),
]);
export type CrearContratoResponse = z.infer<typeof CrearContratoResponseSchema>;
