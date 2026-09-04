import { NextResponse } from "next/server";
import { usuarioService } from "../../../../../services/usuario";
import { rateLimitService } from "../../../../../services/rate-limit";
import { requireAuth } from "../_lib/require-auth";
import { tooManyRequests } from "../_lib/rate-limit-response";
import { mobileCorsPreflight, withMobileCors } from "../_lib/cors";
import {
  CreateUsuarioRequestSchema,
  type ApiErrorResponse,
  type CreateUsuarioResponse,
} from "@gestor-rrhh/shared";

const WRITE_LIMIT = 10;
const WRITE_WINDOW_SECONDS = 60;

const unauthorized = () =>
  NextResponse.json<ApiErrorResponse>(
    { error: { code: "unauthorized", message: "Token de acceso inválido o ausente." } },
    { status: 401 },
  );

const passwordChangeRequired = () =>
  NextResponse.json<ApiErrorResponse>(
    {
      error: {
        code: "password_change_required",
        message: "Debes cambiar tu contraseña antes de continuar. Hazlo desde la aplicación web.",
      },
    },
    { status: 403 },
  );

const badRequest = (message: string) =>
  NextResponse.json<ApiErrorResponse>({ error: { code: "bad_request", message } }, { status: 400 });

const serverError = () =>
  NextResponse.json<ApiErrorResponse>(
    { error: { code: "internal_error", message: "Error interno." } },
    { status: 500 },
  );

export const OPTIONS = (request: Request) => mobileCorsPreflight(request, ["POST"]);

// Igual que crearUsuario en la web: solo ADMIN_SISTEMA. El móvil nunca
// envía nfcUid (sin lector NFC-HID compatible, ver Fase 2.6/2.13).
export const POST = withMobileCors(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.reason === "password_must_change" ? passwordChangeRequired() : unauthorized();
  }
  if (auth.context.role !== "ADMIN_SISTEMA") {
    return unauthorized();
  }

  const limit = await rateLimitService.check(`usuarios:create:${auth.context.userId}`, WRITE_LIMIT, WRITE_WINDOW_SECONDS);
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfterSeconds);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("El cuerpo de la petición debe ser JSON válido.");
  }

  const parsed = CreateUsuarioRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Datos de usuario inválidos.");
  }

  if (parsed.data.rol === "EMPLEADO") {
    if (parsed.data.horasSemanales === undefined) {
      return badRequest("Horas semanales inválidas.");
    }
  }

  try {
    const result = await usuarioService.crearUsuario({
      nombre: parsed.data.nombre,
      dni: parsed.data.dni,
      email: parsed.data.email,
      password: parsed.data.password,
      rol: parsed.data.rol,
      empresaId: parsed.data.empresaId,
      departamentoId: parsed.data.rol === "EMPLEADO" ? parsed.data.departamentoId ?? null : null,
      horasSemanales: parsed.data.rol === "EMPLEADO" ? parsed.data.horasSemanales ?? null : null,
      nfcUid: null,
    });
    // El móvil nunca envía nfcUid, así que "invalid-nfc"/"nfc-taken" no
    // deberían poder ocurrir aquí; se tratan como error interno por si
    // acaso (contrato público más estrecho que el del servicio, igual
    // que el resto de simplificaciones NFC de la Fase 2.13).
    if (result.outcome === "invalid-nfc" || result.outcome === "nfc-taken") {
      console.error("[POST /api/mobile/v1/usuarios] outcome NFC inesperado en móvil:", result.outcome);
      return serverError();
    }
    const response: CreateUsuarioResponse = { outcome: result.outcome };
    return NextResponse.json<CreateUsuarioResponse>(response);
  } catch (error) {
    console.error("[POST /api/mobile/v1/usuarios]", error);
    return serverError();
  }
});
