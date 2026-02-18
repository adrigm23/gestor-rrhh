"use server";

import { auth } from "../api/auth/auth";
import { prisma } from "../lib/prisma";
import { getApprovedLeaveType } from "../lib/vacaciones";
import { hashNfcUid, sanitizeNfcUid } from "../utils/nfc";
import { revalidatePath } from "next/cache";

export type KioskoState = {
  status: "idle" | "success" | "error";
  message?: string;
  accion?: "entrada" | "salida";
  empleado?: string;
};

const emptyState: KioskoState = { status: "idle" };

export async function registrarNfcKiosko(
  _prevState: KioskoState,
  formData: FormData,
): Promise<KioskoState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { status: "error", message: "No autorizado." };
  }

  const role = session.user.role;
  if (role === "EMPLEADO") {
    return { status: "error", message: "No tienes permisos." };
  }

  const uidRaw = formData.get("uid")?.toString() ?? "";
  const uid = sanitizeNfcUid(uidRaw);

  if (!uid) {
    return { status: "error", message: "Acerca la tarjeta al lector." };
  }

  if (uid.length < 4 || uid.length > 32) {
    return { status: "error", message: "UID de tarjeta invalido." };
  }

  const uidHash = hashNfcUid(uid);
  if (!uidHash) {
    return { status: "error", message: "UID invalido." };
  }

  const usuario = await prisma.usuario.findUnique({
    where: { nfcUidHash: uidHash },
    select: { id: true, nombre: true, empresaId: true, rol: true },
  });

  if (!usuario) {
    return { status: "error", message: "Tarjeta sin asignar." };
  }

  if (role === "GERENTE" && usuario.empresaId !== session.user.empresaId) {
    return { status: "error", message: "Tarjeta fuera de tu empresa." };
  }

  const approvedLeave = await getApprovedLeaveType(usuario.id);
  if (approvedLeave) {
    return {
      status: "error",
      message:
        approvedLeave === "VACACIONES"
          ? "Empleado en vacaciones aprobadas. No puede fichar."
          : "Empleado con ausencia aprobada. No puede fichar.",
    };
  }

  const MAX_RETRIES = 2;
  let accion: "entrada" | "salida" = "entrada";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await prisma.$transaction(
        async (tx) => {
          const jornadaActiva = await tx.fichaje.findFirst({
            where: {
              usuarioId: usuario.id,
              salida: null,
              tipo: "JORNADA",
            },
            orderBy: { entrada: "desc" },
          });

          if (jornadaActiva) {
            accion = "salida";

            const pausaActiva = await tx.fichaje.findFirst({
              where: {
                usuarioId: usuario.id,
                salida: null,
                tipo: "PAUSA_COMIDA",
              },
              orderBy: { entrada: "desc" },
            });

            if (pausaActiva) {
              await tx.fichaje.update({
                where: { id: pausaActiva.id },
                data: { salida: new Date() },
              });
            }

            await tx.fichaje.update({
              where: { id: jornadaActiva.id },
              data: { salida: new Date() },
            });
            return;
          }

          accion = "entrada";
          await tx.fichaje.create({
            data: {
              usuarioId: usuario.id,
              entrada: new Date(),
              tipo: "JORNADA",
            },
          });
        },
        { isolationLevel: "Serializable" },
      );
      break;
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "P2034" && attempt < MAX_RETRIES) {
        continue;
      }
      return { status: "error", message: "No se pudo registrar la accion." };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/fichajes");

  return {
    status: "success",
    accion,
    empleado: usuario.nombre,
    message:
      accion === "entrada"
        ? `Entrada registrada para ${usuario.nombre}.`
        : `Salida registrada para ${usuario.nombre}.`,
  };
}
