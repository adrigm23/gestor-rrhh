import { prisma } from "../../app/lib/prisma";
import { getApprovedLeaveType } from "../../app/lib/vacaciones";
import type {
  FichajeCoordinates,
  FichajeEntry,
  FichajeHistoryEntry,
  FichajeService,
  FichajeStatus,
  ToggleFichajeResult,
  TogglePausaResult,
} from "./types";

const MAX_RETRIES = 2;

const isRetryableTransactionConflict = (error: unknown) =>
  (error as { code?: string } | null)?.code === "P2034";

function toFichajeEntry(row: {
  id: string;
  tipo: string;
  entrada: Date;
  salida: Date | null;
}): FichajeEntry {
  return {
    id: row.id,
    tipo: row.tipo as FichajeEntry["tipo"],
    entrada: row.entrada,
    salida: row.salida,
  };
}

export class PrismaFichajeService implements FichajeService {
  async getStatus(userId: string, at: Date = new Date()): Promise<FichajeStatus> {
    const leaveType = await getApprovedLeaveType(userId, at);

    const shift = await prisma.fichaje.findFirst({
      where: { usuarioId: userId, salida: null, tipo: "JORNADA" },
      orderBy: { entrada: "desc" },
    });

    const pause = shift
      ? await prisma.fichaje.findFirst({
          where: {
            usuarioId: userId,
            salida: null,
            tipo: "PAUSA_COMIDA",
            entrada: { gte: shift.entrada },
          },
          orderBy: { entrada: "desc" },
        })
      : null;

    // Traslado 1:1 desde dashboard/calendario/page.tsx: suma de las
    // pausas ya cerradas durante el turno activo (la pausa abierta actual
    // se descuenta aparte, en tiempo real, en el cliente).
    let pauseAccumulatedMs = 0;
    if (shift) {
      const pausasCerradas = await prisma.fichaje.findMany({
        where: {
          usuarioId: userId,
          tipo: "PAUSA_COMIDA",
          entrada: { gte: shift.entrada },
          salida: { not: null },
        },
        orderBy: { entrada: "asc" },
      });
      pauseAccumulatedMs = pausasCerradas.reduce((total, pausa) => {
        const end = pausa.salida ? pausa.salida.getTime() : pausa.entrada.getTime();
        return total + Math.max(0, end - pausa.entrada.getTime());
      }, 0);
    }

    return {
      shift: shift ? toFichajeEntry(shift) : null,
      pause: pause ? toFichajeEntry(pause) : null,
      blockedByLeave: leaveType,
      pauseAccumulatedMs,
    };
  }

  async toggleFichaje(
    userId: string,
    coords?: FichajeCoordinates,
  ): Promise<ToggleFichajeResult> {
    const leaveType = await getApprovedLeaveType(userId);
    if (leaveType) {
      return { outcome: "blocked-by-leave", leaveType };
    }

    // Fase 2.20 (geolocalización, solo registro/auditoría — nunca bloquea
    // el fichaje): si la empresa tiene el ajuste desactivado, se ignoran
    // las coordenadas aunque el cliente las mande. Es un respaldo de
    // privacidad server-side — antes, cualquier cliente (o una llamada
    // directa a la API) podía guardar ubicación igual aunque la empresa
    // hubiera dicho explícitamente que no quería recogerla.
    const empresaGeo = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { empresa: { select: { geolocalizacionFichaje: true } } },
    });
    const effectiveCoords = empresaGeo?.empresa?.geolocalizacionFichaje ? coords : undefined;

    let result: ToggleFichajeResult | undefined;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        result = await prisma.$transaction(
          async (tx) => {
            const ultimoFichaje = await tx.fichaje.findFirst({
              where: { usuarioId: userId, salida: null, tipo: "JORNADA" },
              orderBy: { entrada: "desc" },
            });

            if (ultimoFichaje) {
              const pausaActiva = await tx.fichaje.findFirst({
                where: { usuarioId: userId, salida: null, tipo: "PAUSA_COMIDA" },
                orderBy: { entrada: "desc" },
              });

              let closedPause: FichajeEntry | null = null;
              if (pausaActiva) {
                const updatedPause = await tx.fichaje.update({
                  where: { id: pausaActiva.id },
                  data: { salida: new Date() },
                });
                closedPause = toFichajeEntry(updatedPause);
              }

              const updatedShift = await tx.fichaje.update({
                where: { id: ultimoFichaje.id },
                data: {
                  salida: new Date(),
                  ...(effectiveCoords
                    ? { latitudSalida: effectiveCoords.latitude, longitudSalida: effectiveCoords.longitude }
                    : {}),
                },
              });

              const stopped: ToggleFichajeResult = {
                outcome: "stopped",
                shift: toFichajeEntry(updatedShift),
                closedPause,
              };
              return stopped;
            }

            const createdShift = await tx.fichaje.create({
              data: {
                usuarioId: userId,
                entrada: new Date(),
                tipo: "JORNADA",
                ...(effectiveCoords
                  ? { latitud: effectiveCoords.latitude, longitud: effectiveCoords.longitude }
                  : {}),
              },
            });

            const started: ToggleFichajeResult = {
              outcome: "started",
              shift: toFichajeEntry(createdShift),
            };
            return started;
          },
          { isolationLevel: "Serializable" },
        );
        break;
      } catch (error) {
        if (isRetryableTransactionConflict(error) && attempt < MAX_RETRIES) {
          continue;
        }
        throw error;
      }
    }

    return result as ToggleFichajeResult;
  }

  async togglePausa(userId: string): Promise<TogglePausaResult> {
    const leaveType = await getApprovedLeaveType(userId);
    if (leaveType) {
      return { outcome: "blocked-by-leave", leaveType };
    }

    let result: TogglePausaResult | undefined;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        result = await prisma.$transaction(
          async (tx) => {
            const jornadaActiva = await tx.fichaje.findFirst({
              where: { usuarioId: userId, salida: null, tipo: "JORNADA" },
              orderBy: { entrada: "desc" },
            });

            if (!jornadaActiva) {
              const noActiveShift: TogglePausaResult = { outcome: "no-active-shift" };
              return noActiveShift;
            }

            const pausaActiva = await tx.fichaje.findFirst({
              where: { usuarioId: userId, salida: null, tipo: "PAUSA_COMIDA" },
              orderBy: { entrada: "desc" },
            });

            if (pausaActiva) {
              const updated = await tx.fichaje.update({
                where: { id: pausaActiva.id },
                data: { salida: new Date() },
              });
              const stopped: TogglePausaResult = {
                outcome: "stopped",
                pause: toFichajeEntry(updated),
              };
              return stopped;
            }

            const created = await tx.fichaje.create({
              data: { usuarioId: userId, entrada: new Date(), tipo: "PAUSA_COMIDA" },
            });
            const started: TogglePausaResult = {
              outcome: "started",
              pause: toFichajeEntry(created),
            };
            return started;
          },
          { isolationLevel: "Serializable" },
        );
        break;
      } catch (error) {
        if (isRetryableTransactionConflict(error) && attempt < MAX_RETRIES) {
          continue;
        }
        throw error;
      }
    }

    return result as TogglePausaResult;
  }

  // Traslado 1:1 desde calendario/page.tsx (query "historial"): mismo
  // orden/límite, sin cambiar comportamiento.
  async listHistory(userId: string, limit = 30): Promise<FichajeHistoryEntry[]> {
    const rows = await prisma.fichaje.findMany({
      where: { usuarioId: userId },
      select: { id: true, entrada: true, salida: true, tipo: true, editado: true },
      orderBy: { entrada: "desc" },
      take: limit,
    });

    return rows.map((row) => ({
      id: row.id,
      tipo: row.tipo as FichajeHistoryEntry["tipo"],
      entrada: row.entrada,
      salida: row.salida,
      editado: row.editado,
    }));
  }
}
