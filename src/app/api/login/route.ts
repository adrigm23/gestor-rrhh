import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    ok: false,
    error:
      "Endpoint deshabilitado. Usa el flujo de NextAuth en /api/auth para iniciar sesion.",
  }, { status: 410 });
}
