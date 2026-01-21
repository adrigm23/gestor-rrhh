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
  const MAX_RETRIES = 2;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await prisma.$transaction(
        async (tx) => {
          const ultimoFichaje = await tx.fichaje.findFirst({
            where: {
              usuarioId: userId,
              salida: null,
            },
            orderBy: { entrada: "desc" },
          });

          if (ultimoFichaje) {
            await tx.fichaje.update({
              where: { id: ultimoFichaje.id },
              data: { salida: new Date() },
            });
            return;
          }

          await tx.fichaje.create({
            data: {
              usuarioId: userId,
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
      if (code == "P2034" && attempt < MAX_RETRIES) {
        continue;
      }
      throw error;
    }
  }
  revalidatePath("/dashboard");
}
