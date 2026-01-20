// src/actions/fichaje-actions.ts
"use server";

import { auth } from "../api/auth/auth"; 
import { prisma } from "../lib/prisma"; 
import { revalidatePath } from "next/cache";

export async function toggleFichaje() {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error("No autorizado");
  }

  const userId = session.user.id;

  // 1. Buscar si hay un fichaje abierto (sin fecha de salida)
  const ultimoFichaje = await prisma.fichaje.findFirst({
    where: {
      usuarioId: userId,
      salida: null, // Si es null, es que está "dentro"
    },
    orderBy: { entrada: "desc" },
  });

  if (ultimoFichaje) {
    // === CASO SALIDA ===
    // Si hay uno abierto, lo cerramos (registramos la salida)
    await prisma.fichaje.update({
      where: { id: ultimoFichaje.id },
      data: { salida: new Date() },
    });
  } else {
    // === CASO ENTRADA ===
    // Si no hay ninguno abierto, creamos uno nuevo
    await prisma.fichaje.create({
      data: {
        usuarioId: userId,
        entrada: new Date(),
        tipo: "JORNADA", // Por defecto según tu Enum
      },
    });
  }

  // Recargamos la pantalla del dashboard para ver los cambios al instante
  revalidatePath("/dashboard");
}