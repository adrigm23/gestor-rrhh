import { NextResponse } from "next/server";
import type { ApiErrorResponse } from "@gestor-rrhh/shared";

export function tooManyRequests(retryAfterSeconds?: number) {
  const response = NextResponse.json<ApiErrorResponse>(
    { error: { code: "rate_limit_exceeded", message: "Too many requests" } },
    { status: 429 },
  );

  if (retryAfterSeconds !== undefined) {
    response.headers.set("Retry-After", String(retryAfterSeconds));
  }

  return response;
}
