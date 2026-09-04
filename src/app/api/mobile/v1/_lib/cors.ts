import { NextResponse } from "next/server";

// CORS para el API móvil (/api/mobile/v1/*). Un cliente nativo (Android/iOS)
// no aplica CORS, así que esto solo importa cuando la app corre en un
// navegador (Expo web) contra un backend en otro origen — típicamente en
// desarrollo. Desactivado por completo salvo que se configure
// MOBILE_API_CORS_ORIGINS explícitamente: sin la variable, el
// comportamiento es idéntico al actual (sin cabeceras CORS).
//
// Nunca se usa "*": solo se refleja el origin de la petición si está en la
// lista permitida, y solo por cabecera (no hay cookies/credenciales
// implicadas en el API móvil, que usa Bearer tokens).
function getAllowedOrigins(): string[] {
  const raw = process.env.MOBILE_API_CORS_ORIGINS ?? "";
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function resolveAllowedOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  return getAllowedOrigins().includes(origin) ? origin : null;
}

/** Envuelve un handler de ruta (GET/POST) añadiendo la cabecera CORS a su respuesta cuando el origin está permitido. */
export function withMobileCors<Args extends unknown[]>(
  handler: (request: Request, ...args: Args) => Promise<Response>,
): (request: Request, ...args: Args) => Promise<Response> {
  return async (request: Request, ...args: Args) => {
    const response = await handler(request, ...args);
    const origin = resolveAllowedOrigin(request);
    if (origin) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.append("Vary", "Origin");
    }
    return response;
  };
}

/** Handler de preflight (OPTIONS) para una ruta del API móvil. */
export function mobileCorsPreflight(request: Request, methods: string[]): Response {
  const origin = resolveAllowedOrigin(request);
  if (!origin) {
    return new NextResponse(null, { status: 204 });
  }
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      Vary: "Origin",
      "Access-Control-Allow-Methods": [...methods, "OPTIONS"].join(", "),
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "600",
    },
  });
}
