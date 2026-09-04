import {
  ListSessionsResponseSchema,
  RevokeAllSessionsResponseSchema,
  RevokeSessionResponseSchema,
  type ListSessionsResponse,
  type RevokeAllSessionsResponse,
  type RevokeSessionResponse,
} from "@gestor-rrhh/shared";
import { apiRequest } from "./client";

// Auditoría de seguridad (Fase 2.19, hallazgo #3): gestión de sesiones
// móviles activas desde la propia app — ver perfil.tsx.
export async function listSessions(): Promise<ListSessionsResponse> {
  const body = await apiRequest<unknown>("/api/mobile/v1/me/sessions");
  return ListSessionsResponseSchema.parse(body);
}

export async function revokeSession(sessionId: string): Promise<RevokeSessionResponse> {
  const result = await apiRequest<unknown>(
    `/api/mobile/v1/me/sessions/${encodeURIComponent(sessionId)}`,
    { method: "DELETE" },
  );
  return RevokeSessionResponseSchema.parse(result);
}

export async function revokeAllSessions(): Promise<RevokeAllSessionsResponse> {
  const result = await apiRequest<unknown>("/api/mobile/v1/me/sessions/revoke-all", {
    method: "POST",
  });
  return RevokeAllSessionsResponseSchema.parse(result);
}
