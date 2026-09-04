import {
  ChangePasswordRequestSchema,
  ChangePasswordResponseSchema,
  UpdateProfileRequestSchema,
  UpdateProfileResponseSchema,
  UsuarioProfileDtoSchema,
  type ChangePasswordRequest,
  type ChangePasswordResponse,
  type UpdateProfileRequest,
  type UpdateProfileResponse,
  type UsuarioProfileDto,
} from "@gestor-rrhh/shared";
import { apiRequest } from "./client";

export async function getProfile(): Promise<UsuarioProfileDto> {
  const body = await apiRequest<unknown>("/api/mobile/v1/me");
  return UsuarioProfileDtoSchema.parse(body);
}

export async function updateProfile(input: UpdateProfileRequest): Promise<UpdateProfileResponse> {
  const payload = UpdateProfileRequestSchema.parse(input);
  const result = await apiRequest<unknown>("/api/mobile/v1/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return UpdateProfileResponseSchema.parse(result);
}

export async function changePassword(input: ChangePasswordRequest): Promise<ChangePasswordResponse> {
  const payload = ChangePasswordRequestSchema.parse(input);
  const result = await apiRequest<unknown>("/api/mobile/v1/me/password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return ChangePasswordResponseSchema.parse(result);
}
