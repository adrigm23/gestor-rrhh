import { z } from "zod";
import { SolicitudDtoSchema } from "./solicitud";

export const FichajeCalendarioDtoSchema = z.object({
  entrada: z.string().datetime(),
  salida: z.string().datetime().nullable(),
});
export type FichajeCalendarioDto = z.infer<typeof FichajeCalendarioDtoSchema>;

export const GetCalendarioResponseSchema = z.object({
  // Reutiliza SolicitudDto tal cual (mismo shape que "Mis solicitudes" en
  // la pestaña Solicitudes) — no hace falta un DTO nuevo para esto.
  solicitudes: z.array(SolicitudDtoSchema),
  fichajes: z.array(FichajeCalendarioDtoSchema),
});
export type GetCalendarioResponse = z.infer<typeof GetCalendarioResponseSchema>;
