import { z } from "zod";

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  deviceName: z.string().max(120).optional(),
  platform: z.string().max(40).optional(),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.discriminatedUnion("outcome", [
  z.object({
    outcome: z.literal("ok"),
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresIn: z.number(),
    user: z.object({
      id: z.string(),
      role: z.enum(["ADMIN_SISTEMA", "GERENTE", "EMPLEADO"]),
      empresaId: z.string().nullable(),
      passwordMustChange: z.boolean(),
    }),
  }),
  z.object({ outcome: z.literal("invalid-credentials") }),
]);
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const RefreshResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;

export const LogoutResponseSchema = z.object({
  success: z.literal(true),
});
export type LogoutResponse = z.infer<typeof LogoutResponseSchema>;

// Auditoría de seguridad (Fase 2.19, hallazgo #3): gestión de sesiones
// móviles activas ("dónde tengo sesión iniciada" + revocar dispositivos).
export const MobileSessionDtoSchema = z.object({
  id: z.string(),
  deviceName: z.string().nullable(),
  platform: z.string().nullable(),
  createdAt: z.string().datetime(),
  lastUsedAt: z.string().datetime().nullable(),
  expiresAt: z.string().datetime(),
});
export type MobileSessionDto = z.infer<typeof MobileSessionDtoSchema>;

export const ListSessionsResponseSchema = z.object({
  sessions: z.array(MobileSessionDtoSchema),
});
export type ListSessionsResponse = z.infer<typeof ListSessionsResponseSchema>;

export const RevokeSessionResponseSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("ok") }),
  z.object({ outcome: z.literal("not-found") }),
]);
export type RevokeSessionResponse = z.infer<typeof RevokeSessionResponseSchema>;

export const RevokeAllSessionsResponseSchema = z.object({
  outcome: z.literal("ok"),
  revokedCount: z.number(),
});
export type RevokeAllSessionsResponse = z.infer<typeof RevokeAllSessionsResponseSchema>;
