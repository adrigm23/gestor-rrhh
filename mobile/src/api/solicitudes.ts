import {
  CreateSolicitudRequestSchema,
  CreateSolicitudResponseSchema,
  ListSolicitudesResponseSchema,
  type CreateSolicitudRequest,
  type CreateSolicitudResponse,
  type ListSolicitudesResponse,
} from "@gestor-rrhh/shared";
import { apiRequest } from "./client";

export async function listSolicitudes(): Promise<ListSolicitudesResponse> {
  const body = await apiRequest<unknown>("/api/mobile/v1/solicitudes");
  return ListSolicitudesResponseSchema.parse(body);
}

export async function createSolicitud(
  input: CreateSolicitudRequest,
): Promise<CreateSolicitudResponse> {
  const payload = CreateSolicitudRequestSchema.parse(input);
  const result = await apiRequest<unknown>("/api/mobile/v1/solicitudes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return CreateSolicitudResponseSchema.parse(result);
}
