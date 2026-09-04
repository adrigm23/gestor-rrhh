import { prisma } from "../../app/lib/prisma";
import type { CalendarioResult, CalendarioService } from "./types";

// Traslado 1:1 desde dashboard/calendario/page.tsx (Fase 2.17).
export class PrismaCalendarioService implements CalendarioService {
  async getRango(userId: string, desde: Date, hasta: Date): Promise<CalendarioResult> {
    const [solicitudes, fichajes] = await Promise.all([
      prisma.solicitud.findMany({
        where: {
          usuarioId: userId,
          OR: [
            { inicio: { gte: desde, lte: hasta } },
            { fin: { gte: desde, lte: hasta } },
            {
              AND: [{ inicio: { lte: desde } }, { fin: { gte: hasta } }],
            },
          ],
        },
        orderBy: { inicio: "asc" },
      }),
      prisma.fichaje.findMany({
        where: {
          usuarioId: userId,
          entrada: { gte: desde, lte: hasta },
        },
        select: { entrada: true, salida: true },
      }),
    ]);

    return {
      solicitudes: solicitudes.map((s) => ({
        id: s.id,
        tipo: s.tipo,
        estado: s.estado,
        inicio: s.inicio,
        fin: s.fin,
        createdAt: s.createdAt,
        motivo: s.motivo,
        ausenciaTipo: s.ausenciaTipo,
      })),
      fichajes,
    };
  }
}
