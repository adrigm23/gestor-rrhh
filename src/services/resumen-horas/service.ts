import { prisma } from "../../app/lib/prisma";
import type { GetResumenResult, ResumenHoras, ResumenHorasService } from "./types";

// Traslado 1:1 desde escritorio/page.tsx.
const startOfWeek = (date: Date) => {
  const day = (date.getDay() + 6) % 7;
  const start = new Date(date);
  start.setDate(date.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return start;
};

const endOfWeek = (date: Date) => {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
};

const clampRange = (start: Date, end: Date, now: Date) => {
  const safeEnd = end.getTime() > now.getTime() ? now : end;
  return { start, end: safeEnd };
};

export class PrismaResumenHorasService implements ResumenHorasService {
  async getResumen(
    actorId: string,
    actorRole: "EMPLEADO" | "GERENTE",
    empleadoId?: string,
  ): Promise<GetResumenResult> {
    const actor = await prisma.usuario.findUnique({
      where: { id: actorId },
      select: { empresaId: true, empresa: { select: { nombre: true, pausaCuentaComoTrabajo: true } } },
    });

    if (!actor?.empresaId) {
      return { outcome: "no-empresa" };
    }

    const empresaId = actor.empresaId;
    const pausaCuenta = actor.empresa?.pausaCuentaComoTrabajo ?? true;

    const targetId = actorRole === "EMPLEADO" ? actorId : empleadoId;
    if (!targetId) {
      return { outcome: "empleado-not-found" };
    }

    const empleado =
      actorRole === "EMPLEADO"
        ? await prisma.usuario.findUnique({
            where: { id: targetId },
            select: { id: true, nombre: true, email: true },
          })
        : await prisma.usuario.findFirst({
            where: { id: targetId, empresaId, rol: "EMPLEADO" },
            select: { id: true, nombre: true, email: true },
          });

    if (!empleado) {
      return { outcome: "empleado-not-found" };
    }

    const now = new Date();
    const range = clampRange(startOfWeek(now), endOfWeek(now), now);

    const contrato = await prisma.contrato.findFirst({
      where: {
        usuarioId: empleado.id,
        fechaInicio: { lte: range.end },
        OR: [{ fechaFin: null }, { fechaFin: { gte: range.start } }],
      },
      orderBy: { fechaInicio: "desc" },
    });

    const fichajes = await prisma.fichaje.findMany({
      where: {
        usuarioId: empleado.id,
        entrada: { lte: range.end },
        OR: [{ salida: null }, { salida: { gte: range.start } }],
      },
      orderBy: { entrada: "desc" },
    });

    let jornadaMs = 0;
    let pausaMs = 0;
    const fichajeEntries: ResumenHoras["fichajes"] = [];

    for (const fichaje of fichajes) {
      const start = Math.max(fichaje.entrada.getTime(), range.start.getTime());
      const end = Math.min((fichaje.salida ?? now).getTime(), range.end.getTime());
      const duration = Math.max(0, end - start);

      if (end > start) {
        if (fichaje.tipo === "PAUSA_COMIDA") pausaMs += duration;
        else if (fichaje.tipo === "JORNADA") jornadaMs += duration;
      }

      fichajeEntries.push({
        id: fichaje.id,
        entrada: fichaje.entrada,
        salida: fichaje.salida,
        tipo: fichaje.tipo as ResumenHoras["fichajes"][number]["tipo"],
        durationMs: duration,
      });
    }

    const totalMs = pausaCuenta ? jornadaMs : Math.max(0, jornadaMs - pausaMs);
    const contratoHoras = contrato?.horasSemanales ?? null;
    const totalHoras = totalMs / 3_600_000;
    const progreso = contratoHoras && contratoHoras > 0 ? Math.min(100, (totalHoras / contratoHoras) * 100) : null;

    return {
      outcome: "ok",
      data: {
        empleadoNombre: empleado.nombre,
        empleadoEmail: empleado.email,
        empresaNombre: actor.empresa?.nombre ?? null,
        pausaCuentaComoTrabajo: pausaCuenta,
        rangeStart: range.start,
        rangeEnd: range.end,
        totalMs,
        contratoHorasSemanales: contratoHoras,
        contratoDesde: contrato?.fechaInicio ?? null,
        progresoPercent: progreso,
        fichajes: fichajeEntries,
      },
    };
  }
}
