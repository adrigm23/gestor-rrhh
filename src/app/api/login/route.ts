import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { comparePassword } from "../../utils/password";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LEN = 254;
const MAX_PASSWORD_LEN = 512;

const normalizeEmail = (value: string) => value.trim().toLowerCase();

type LoginPayload = {
  email?: unknown;
  password?: unknown;
};

export async function POST(request: Request) {
  let payload: LoginPayload;
  try {
    payload = (await request.json()) as LoginPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON invalido." },
      { status: 400 },
    );
  }

  const emailRaw = typeof payload.email === "string" ? payload.email : "";
  const passwordRaw =
    typeof payload.password === "string" ? payload.password : "";
  const email = normalizeEmail(emailRaw);

  if (!email || !passwordRaw) {
    return NextResponse.json(
      { ok: false, error: "Email y password son obligatorios." },
      { status: 400 },
    );
  }

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json(
      { ok: false, error: "Formato de email invalido." },
      { status: 400 },
    );
  }

  if (email.length > MAX_EMAIL_LEN || passwordRaw.length > MAX_PASSWORD_LEN) {
    return NextResponse.json(
      { ok: false, error: "Entrada demasiado larga." },
      { status: 400 },
    );
  }

  const user = await prisma.usuario.findUnique({
    where: { email },
    select: { id: true, password: true, rol: true, activo: true },
  });

  if (!user || !user.password || user.activo === false) {
    return NextResponse.json(
      { ok: false, error: "Credenciales invalidas." },
      { status: 401 },
    );
  }

  const valid = await comparePassword(passwordRaw, user.password);
  if (!valid) {
    return NextResponse.json(
      { ok: false, error: "Credenciales invalidas." },
      { status: 401 },
    );
  }

  return NextResponse.json({
    ok: true,
    user: { id: user.id, rol: user.rol },
  });
}
