import { prisma } from "../../app/lib/prisma";
import type {
  CreateSolicitudInput,
  CreateSolicitudResult,
  EstadoTransicion,
  ManagerRole,
  SolicitudEntry,
  SolicitudService,
  SolicitudWithUsuario,
  UpdateSolicitudEstadoResult,
} from "./types";

function toSolicitudEntry(row: {
  id: string;
  tipo: string;
  estado: string;
  inicio: Date;
  fin: Date | null;
  motivo: string | null;
  ausenciaTipo: string | null;
  createdAt: Date;
  justificanteNombre: string | null;
  justificanteRuta: string | null;
}): SolicitudEntry {
  return {
    id: row.id,
    tipo: row.tipo as SolicitudEntry["tipo"],
    estado: row.estado as SolicitudEntry["estado"],
    inicio: row.inicio,
    fin: row.fin,
    motivo: row.motivo,
    ausenciaTipo: row.ausenciaTipo as SolicitudEntry["ausenciaTipo"],
    createdAt: row.createdAt,
    justificanteNombre: row.justificanteNombre,
    justificanteRuta: row.justificanteRuta,
  };
}

function toSolicitudWithUsuario(
  row: Parameters<typeof toSolicitudEntry>[0] & { usuario: { nombre: string; email: string } },
): SolicitudWithUsuario {
  return {
    ...toSolicitudEntry(row),
    usuarioNombre: row.usuario.nombre,
    usuarioEmail: row.usuario.email,
  };
}

// Traslado 1:1 desde solicitudes-actions.ts (actualizarSolicitud), única
// llamadora ahora de resolveRange — el resto de la lógica de creación usa
// overlapCondition directamente con inicio/fin ya resueltos.
const resolveRange = (inicio: Date, fin: Date | null) => ({
  inicio,
  fin: fin ?? inicio,
});

// Traslado 1:1 desde solicitudes-actions.ts (solicitarVacaciones / notificarAusencia):
// misma condición de solape, sin cambiar comportamiento.
const overlapCondition = (inicio: Date, fin: Date) => ({
  OR: [
    {
      AND: [{ fin: null }, { inicio: { gte: inicio } }, { inicio: { lte: fin } }],
    },
    {
      AND: [{ fin: { not: null } }, { inicio: { lte: fin } }, { fin: { gte: inicio } }],
    },
  ],
});

export class PrismaSolicitudService implements SolicitudService {
  async listRecent(usuarioId: string, limit = 20): Promise<SolicitudEntry[]> {
    const rows = await prisma.solicitud.findMany({
      where: { usuarioId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toSolicitudEntry);
  }

  async create(usuarioId: string, input: CreateSolicitudInput): Promise<CreateSolicitudResult> {
    if (input.tipo === "AUSENCIA") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (input.ausenciaTipo === "FALTA" && input.inicio.getTime() > today.getTime()) {
        return {
          outcome: "invalid-date-range",
          message: "La fecha de inicio no puede ser futura si ya has faltado.",
        };
      }

      if (input.ausenciaTipo === "AVISO" && input.inicio.getTime() < today.getTime()) {
        return {
          outcome: "invalid-date-range",
          message: "La fecha de inicio no puede ser pasada si vas a faltar.",
        };
      }
    }

    const overlapping = await prisma.solicitud.findFirst({
      where: {
        usuarioId,
        tipo: { in: ["VACACIONES", "AUSENCIA"] },
        estado: { in: ["PENDIENTE", "APROBADA"] },
        ...overlapCondition(input.inicio, input.fin),
      },
      select: { id: true },
    });

    if (overlapping) {
      return { outcome: "overlap" };
    }

    const created = await prisma.solicitud.create({
      data:
        input.tipo === "VACACIONES"
          ? {
              usuarioId,
              tipo: "VACACIONES",
              inicio: input.inicio,
              fin: input.fin,
              motivo: input.motivo,
            }
          : {
              usuarioId,
              tipo: "AUSENCIA",
              inicio: input.inicio,
              fin: input.fin,
              motivo: input.motivo,
              ausenciaTipo: input.ausenciaTipo,
            },
    });

    return { outcome: "ok", solicitud: toSolicitudEntry(created) };
  }

  private async resolveGerenteEmpresaId(actorId: string): Promise<string | null> {
    const gerente = await prisma.usuario.findUnique({
      where: { id: actorId },
      select: { empresaId: true },
    });
    return gerente?.empresaId ?? null;
  }

  // Traslado 1:1 desde vacaciones-ausencias/page.tsx: GERENTE ve solo su
  // empresa (o nada si no se le resuelve empresaId); ADMIN_SISTEMA ve todas.
  async listPendingForManager(
    actorId: string,
    actorRole: ManagerRole,
    limit = 30,
  ): Promise<SolicitudWithUsuario[]> {
    const empresaId = actorRole === "GERENTE" ? await this.resolveGerenteEmpresaId(actorId) : null;

    if (actorRole === "GERENTE" && !empresaId) {
      return [];
    }

    const rows = await prisma.solicitud.findMany({
      where: {
        estado: "PENDIENTE",
        ...(empresaId ? { usuario: { empresaId } } : {}),
      },
      include: { usuario: { select: { nombre: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return rows.map(toSolicitudWithUsuario);
  }

  async listHistoryForManager(
    actorId: string,
    actorRole: ManagerRole,
    limit = 10,
  ): Promise<SolicitudWithUsuario[]> {
    const empresaId = actorRole === "GERENTE" ? await this.resolveGerenteEmpresaId(actorId) : null;

    if (actorRole === "GERENTE" && !empresaId) {
      return [];
    }

    const rows = await prisma.solicitud.findMany({
      where: {
        estado: { in: ["APROBADA", "RECHAZADA", "ANULADA"] },
        ...(empresaId ? { usuario: { empresaId } } : {}),
      },
      include: { usuario: { select: { nombre: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return rows.map(toSolicitudWithUsuario);
  }

  // Traslado 1:1 desde solicitudes-actions.ts (actualizarSolicitud): mismas
  // reglas de transición de estado y de solape al aprobar.
  async updateEstado(
    actorId: string,
    actorRole: ManagerRole,
    solicitudId: string,
    estado: EstadoTransicion,
  ): Promise<UpdateSolicitudEstadoResult> {
    const solicitud = await prisma.solicitud.findUnique({
      where: { id: solicitudId },
      include: { usuario: { select: { empresaId: true } } },
    });

    if (!solicitud) {
      return { outcome: "not-found" };
    }

    if (actorRole === "GERENTE") {
      const empresaId = await this.resolveGerenteEmpresaId(actorId);
      if (!empresaId || empresaId !== solicitud.usuario.empresaId) {
        return { outcome: "unauthorized" };
      }
    }

    if (solicitud.estado === "PENDIENTE" && estado === "ANULADA") {
      return { outcome: "cannot-cancel-pending" };
    }

    if (solicitud.estado !== "PENDIENTE" && !(solicitud.estado === "APROBADA" && estado === "ANULADA")) {
      return { outcome: "invalid-transition" };
    }

    if (solicitud.estado === "PENDIENTE" && estado === "APROBADA") {
      const range = resolveRange(solicitud.inicio, solicitud.fin);
      const overlapApproved = await prisma.solicitud.findFirst({
        where: {
          id: { not: solicitud.id },
          usuarioId: solicitud.usuarioId,
          tipo: { in: ["VACACIONES", "AUSENCIA"] },
          estado: "APROBADA",
          ...overlapCondition(range.inicio, range.fin),
        },
        select: { id: true },
      });

      if (overlapApproved) {
        return { outcome: "overlap" };
      }
    }

    await prisma.solicitud.update({ where: { id: solicitudId }, data: { estado } });
    return { outcome: "ok" };
  }
}
