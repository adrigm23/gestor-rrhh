import { z } from "zod";

export const ApiErrorResponseSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

// Auditoría de seguridad (Fase 2.19, hallazgo #8): antes solo se exigía
// min(8) sin ningún requisito de composición en los tres sitios donde se
// fija una contraseña (alta de empleado, reset de admin, cambio propio) —
// y el reset de autoservicio por token ni siquiera comprobaba longitud
// mínima. Política elegida deliberadamente moderada (siguiendo NIST 800-63B:
// la longitud pesa más que la composición forzada) en vez de exigir
// mayúsculas/símbolos, que añade poca entropía real y solo empuja a
// patrones predecibles ("Passw0rd!"). Un único punto de verdad reutilizado
// en los tres formularios y en el reset de autoservicio.
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 256;

export const PasswordPolicySchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`)
  .max(PASSWORD_MAX_LENGTH)
  .refine((value) => /[a-zA-Z]/.test(value) && /[0-9]/.test(value), {
    message: "La contraseña debe incluir al menos una letra y un número.",
  });
