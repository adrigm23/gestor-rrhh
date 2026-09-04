import {
  CreateModificacionFichajeRequestSchema,
  CreateModificacionFichajeResponseSchema,
  ListEmpleadosResponseSchema,
  ListFichajesForEmpleadoResponseSchema,
  ListModificacionesManagerResponseSchema,
  type CreateModificacionFichajeRequest,
  type CreateModificacionFichajeResponse,
  type ListEmpleadosResponse,
  type ListFichajesForEmpleadoResponse,
  type ListModificacionesManagerResponse,
} from "@gestor-rrhh/shared";
import { apiRequest } from "./client";

export async function listEmpleados(): Promise<ListEmpleadosResponse> {
  const body = await apiRequest<unknown>("/api/mobile/v1/empleados");
  return ListEmpleadosResponseSchema.parse(body);
}

export async function listFichajesForEmpleado(empleadoId: string): Promise<ListFichajesForEmpleadoResponse> {
  const body = await apiRequest<unknown>(`/api/mobile/v1/empleados/${empleadoId}/fichajes`);
  return ListFichajesForEmpleadoResponseSchema.parse(body);
}

export async function listModificacionesGestion(): Promise<ListModificacionesManagerResponse> {
  const body = await apiRequest<unknown>("/api/mobile/v1/modificaciones-fichaje-gestion");
  return ListModificacionesManagerResponseSchema.parse(body);
}

export async function createModificacionFichaje(
  input: CreateModificacionFichajeRequest,
): Promise<CreateModificacionFichajeResponse> {
  const payload = CreateModificacionFichajeRequestSchema.parse(input);
  const result = await apiRequest<unknown>("/api/mobile/v1/modificaciones-fichaje-gestion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return CreateModificacionFichajeResponseSchema.parse(result);
}
