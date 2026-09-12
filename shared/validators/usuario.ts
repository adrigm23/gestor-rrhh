import { z } from "zod";
import { PasswordPolicySchema } from "./common";

export const UsuarioProfileDtoSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  email: z.string(),
  rol: z.enum(["EMPLEADO", "GERENTE", "ADMIN_SISTEMA"]),
  // Fase 2.20: si la empresa quiere guardar la ubicación al fichar
  // (solo registro/auditoría — nunca bloquea el fichaje).
  geolocalizacionFichaje: z.boolean(),
});
export type UsuarioProfileDto = z.infer<typeof UsuarioProfileDtoSchema>;

export const UpdateProfileRequestSchema = z.object({
  nombre: z.string().trim().min(1).max(200),
  email: z.string().trim().email(),
});
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

export const UpdateProfileResponseSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("ok"), profile: UsuarioProfileDtoSchema }),
  z.object({ outcome: z.literal("email-taken") }),
]);
export type UpdateProfileResponse = z.infer<typeof UpdateProfileResponseSchema>;

export const ChangePasswordRequestSchema = z
  .object({
    currentPassword: z.string().min(1).max(256),
    newPassword: PasswordPolicySchema,
    confirmPassword: z.string().min(1).max(256),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;

export const ChangePasswordResponseSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("ok") }),
  z.object({ outcome: z.literal("invalid-current-password") }),
]);
export type ChangePasswordResponse = z.infer<typeof ChangePasswordResponseSchema>;

// Selector mínimo de empleados para formularios de gestor/admin (p. ej.
// proponer una corrección de fichaje, Fase 2.11). No es el directorio
// completo de la Fase 2.13.
export const EmpleadoOptionDtoSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  email: z.string(),
});
export type EmpleadoOptionDto = z.infer<typeof EmpleadoOptionDtoSchema>;

export const ListEmpleadosResponseSchema = z.object({
  empleados: z.array(EmpleadoOptionDtoSchema),
});
export type ListEmpleadosResponse = z.infer<typeof ListEmpleadosResponseSchema>;
