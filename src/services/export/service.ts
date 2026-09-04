import { Prisma, TipoFichaje } from "@prisma/client";
import { prisma } from "../../app/lib/prisma";
import { createSignedUrl, uploadExportCsv } from "../../app/lib/supabase-storage";
import { formatAppDateTime } from "../../app/utils/datetime";
import { sanitizeId, sanitizeString } from "../../app/utils/input";
import type {
  CrearExportacionInput,
  CrearExportacionResult,
  ExportacionStatus,
  ExportFiltros,
  ExportService,
  Rol,
} from "./types";

const MAX_EXPORT_ROWS = 25000;
const EXPORT_BUCKET =
  process.env.SUPABASE_EXPORT_BUCKET ?? process.env.SUPABASE_STORAGE_BUCKET ?? "justificantes";

const parseDate = (value: string | null, endOfDay: boolean) => {
  if (!value) return null;
  const suffix = endOfDay ? "T23:59:59" : "T00:00:00";
  const date = new Date(`${value}${suffix}`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatTipo = (tipo: string) => {
  switch (tipo) {
    case "PAUSA_COMIDA":
      return "Pausa comida";
    case "DESCANSO":
      return "Descanso";
    case "MEDICO":
      return "Medico";
    default:
      return "Jornada";
  }
};

const formatDuration = (entrada: Date, salida?: Date | null) => {
  if (!salida) return "En curso";
  const diffMs = Math.max(0, salida.getTime() - entrada.getTime());
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const padded = (value: number) => value.toString().padStart(2, "0");
  return `${padded(hours)}:${padded(minutes)} Hrs`;
};

const escapeCsv = (value: string) => {
  const raw = String(value);
  const guarded = /^[\s]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  const needsEscape = guarded.includes(",") || guarded.includes("\"") || guarded.includes("\n");
  if (!needsEscape) return guarded;
  return `"${guarded.replace(/"/g, "\"\"")}"`;
};

const sanitizeFilenamePart = (value: string | undefined, fallback: string) => {
  const cleaned = sanitizeString(value, { maxLength: 32 }).replace(/[^a-zA-Z0-9_-]/g, "");
  return cleaned || fallback;
};

const buildWhereClause = (filters: ExportFiltros, empresaId?: string | null) => {
  const fromParam = sanitizeString(filters.from ?? null, { maxLength: 10 }) || null;
  const toParam = sanitizeString(filters.to ?? null, { maxLength: 10 }) || null;
  const estadoRaw = sanitizeString(filters.estado ?? "todos").toLowerCase();
  const estadoParam = estadoRaw === "abierto" || estadoRaw === "cerrado" ? estadoRaw : "todos";
  const tipoParam = sanitizeString(filters.tipo ?? "todos").toUpperCase();
  const empleadoParam = sanitizeId(filters.empleadoId ?? "");

  let desde = parseDate(fromParam, false);
  let hasta = parseDate(toParam, true);
  if (desde && hasta && hasta < desde) {
    const temp = desde;
    desde = hasta;
    hasta = temp;
  }

  const whereClause: Prisma.FichajeWhereInput = {};

  if (empresaId) {
    whereClause.usuario = { empresaId };
  }

  if (empleadoParam) {
    whereClause.usuarioId = empleadoParam;
  }

  if (desde || hasta) {
    whereClause.entrada = {
      ...(desde ? { gte: desde } : {}),
      ...(hasta ? { lte: hasta } : {}),
    };
  }

  if (estadoParam === "abierto") {
    whereClause.salida = { equals: null };
  } else if (estadoParam === "cerrado") {
    whereClause.salida = { not: null };
  }

  if (tipoParam && tipoParam !== "TODOS") {
    const allowed: TipoFichaje[] = ["JORNADA", "PAUSA_COMIDA", "DESCANSO", "MEDICO"];
    if (allowed.includes(tipoParam as TipoFichaje)) {
      whereClause.tipo = tipoParam as TipoFichaje;
    }
  }

  return { whereClause };
};

const buildEmpresaResumen = (
  items: {
    entrada: Date;
    salida: Date | null;
    editado: boolean;
    usuarioId: string;
    usuario: { empresa: { id: string; nombre: string; cif: string } | null };
  }[],
) => {
  const resumen = new Map<
    string,
    {
      id: string;
      nombre: string;
      cif: string;
      total: number;
      abiertos: number;
      cerrados: number;
      editados: number;
      minutos: number;
      empleados: Set<string>;
    }
  >();

  const diffMinutes = (entrada: Date, salida?: Date | null) => {
    if (!salida) return 0;
    const diffMs = Math.max(0, salida.getTime() - entrada.getTime());
    return Math.floor(diffMs / 60000);
  };

  for (const fichaje of items) {
    const empresa = fichaje.usuario.empresa;
    if (!empresa) continue;

    let item = resumen.get(empresa.id);
    if (!item) {
      item = {
        id: empresa.id,
        nombre: empresa.nombre,
        cif: empresa.cif,
        total: 0,
        abiertos: 0,
        cerrados: 0,
        editados: 0,
        minutos: 0,
        empleados: new Set<string>(),
      };
      resumen.set(empresa.id, item);
    }

    item.total += 1;
    if (fichaje.salida) {
      item.cerrados += 1;
      item.minutos += diffMinutes(fichaje.entrada, fichaje.salida);
    } else {
      item.abiertos += 1;
    }

    if (fichaje.editado) {
      item.editados += 1;
    }

    if (fichaje.usuarioId) {
      item.empleados.add(fichaje.usuarioId);
    }
  }

  const formatTotalMinutes = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const padded = (value: number) => value.toString().padStart(2, "0");
    return `${padded(hours)}:${padded(minutes)} Hrs`;
  };

  return [...resumen.values()]
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    .map((item) => {
      const values = [
        item.nombre,
        item.cif,
        String(item.empleados.size),
        String(item.total),
        String(item.abiertos),
        String(item.cerrados),
        String(item.editados),
        formatTotalMinutes(item.minutos),
      ];
      return values.map((value) => escapeCsv(String(value))).join(",");
    });
};

// Traslado 1:1 desde export-actions.ts (Fase 2.15).
export class PrismaExportService implements ExportService {
  // Dedup en memoria de jobs en proceso, igual que runningExportJobs en la
  // web (no hay cola real de fondo: el job se procesa dentro de la propia
  // petición que lo crea o consulta).
  private runningExportJobs = new Set<string>();

  private async runExportJob(jobId: string): Promise<void> {
    const safeJobId = sanitizeId(jobId);
    if (!safeJobId) return;

    try {
      const job = await prisma.exportacion.findUnique({
        where: { id: safeJobId },
        select: {
          id: true,
          tipo: true,
          estado: true,
          filtros: true,
          empresaId: true,
          empleadoId: true,
          solicitadoPorId: true,
        },
      });

      if (!job || job.estado === "LISTO") return;

      await prisma.exportacion.update({
        where: { id: safeJobId },
        data: { estado: "GENERANDO", error: null },
      });

      const user = await prisma.usuario.findUnique({
        where: { id: job.solicitadoPorId },
        select: { rol: true, empresaId: true },
      });

      if (!user || user.rol === "EMPLEADO") {
        throw new Error("No autorizado");
      }

      const filtros = (job.filtros ?? {}) as ExportFiltros;

      const empresaFiltro = user.rol === "GERENTE" ? user.empresaId ?? "" : job.empresaId ?? "";

      if (job.tipo === "FICHAJES" && !empresaFiltro) {
        throw new Error("Empresa requerida para exportar fichajes.");
      }

      if (job.tipo === "FICHAJES") {
        const { whereClause } = buildWhereClause(filtros, empresaFiltro);

        const fichajes = await prisma.fichaje.findMany({
          where: whereClause,
          include: {
            usuario: {
              select: {
                nombre: true,
                email: true,
                empresa: { select: { nombre: true } },
              },
            },
          },
          orderBy: { entrada: "desc" },
          take: MAX_EXPORT_ROWS + 1,
        });

        if (fichajes.length > MAX_EXPORT_ROWS) {
          throw new Error(`Demasiados registros para exportar (maximo ${MAX_EXPORT_ROWS}). Acota los filtros.`);
        }

        const header = [
          "Empleado",
          "Email",
          "Empresa",
          "Entrada",
          "Salida",
          "Tiempo",
          "Tipo",
          "Estado",
          "Editado",
          "Motivo",
        ].join(",");

        const rows = fichajes.map((item) => {
          const values = [
            item.usuario.nombre,
            item.usuario.email,
            item.usuario.empresa?.nombre ?? "",
            formatAppDateTime(item.entrada),
            item.salida ? formatAppDateTime(item.salida) : "En curso",
            formatDuration(item.entrada, item.salida),
            formatTipo(item.tipo),
            item.salida ? "Cerrado" : "Abierto",
            item.editado ? "Si" : "No",
            item.motivoEdicion ?? "",
          ];
          return values.map((value) => escapeCsv(String(value))).join(",");
        });

        const csv = [header, ...rows].join("\n");
        const filename = `exports/${job.id}/fichajes-${sanitizeFilenamePart(filtros.from, "inicio")}-${sanitizeFilenamePart(filtros.to, "fin")}.csv`;

        await uploadExportCsv(csv, filename);

        await prisma.exportacion.update({
          where: { id: job.id },
          data: { estado: "LISTO", archivoRuta: filename },
        });
        return;
      }

      // Auditoría de seguridad (Fase 2.19, hallazgo #24): a diferencia de
      // FICHAJES, aquí SÍ es intencional que empresaFiltro pueda llegar
      // vacío — es el modo "resumen global" de ADMIN_SISTEMA cuando no
      // elige empresa en crearExportacion (empresaIdForm null). GERENTE no
      // puede alcanzar este camino: su empresaFiltro siempre viene de
      // user.empresaId (no nullable en el schema), nunca de job.empresaId.
      const { whereClause } = buildWhereClause(filtros, empresaFiltro);

      const fichajes = await prisma.fichaje.findMany({
        where: whereClause,
        select: {
          entrada: true,
          salida: true,
          editado: true,
          usuarioId: true,
          usuario: {
            select: {
              empresa: { select: { id: true, nombre: true, cif: true } },
            },
          },
        },
        orderBy: { entrada: "desc" },
        take: MAX_EXPORT_ROWS + 1,
      });

      if (fichajes.length > MAX_EXPORT_ROWS) {
        throw new Error(`Demasiados registros para exportar (maximo ${MAX_EXPORT_ROWS}). Acota los filtros.`);
      }

      const header = [
        "Empresa",
        "CIF",
        "Empleados",
        "Fichajes",
        "Abiertos",
        "Cerrados",
        "Editados",
        "Tiempo total",
      ].join(",");

      const rows = buildEmpresaResumen(fichajes);

      const csv = [header, ...rows].join("\n");
      const filename = `exports/${job.id}/fichajes-empresas-${sanitizeFilenamePart(filtros.from, "inicio")}-${sanitizeFilenamePart(filtros.to, "fin")}.csv`;

      await uploadExportCsv(csv, filename);

      await prisma.exportacion.update({
        where: { id: job.id },
        data: { estado: "LISTO", archivoRuta: filename },
      });
    } catch (error) {
      await prisma.exportacion.update({
        where: { id: safeJobId },
        data: {
          estado: "ERROR",
          error: error instanceof Error ? error.message : "Error desconocido",
        },
      });
    }
  }

  private async ensureExportJobProgress(jobId: string): Promise<void> {
    const safeJobId = sanitizeId(jobId);
    if (!safeJobId || this.runningExportJobs.has(safeJobId)) return;
    this.runningExportJobs.add(safeJobId);
    try {
      await this.runExportJob(safeJobId);
    } finally {
      this.runningExportJobs.delete(safeJobId);
    }
  }

  async crearExportacion(actorId: string, actorRole: Rol, input: CrearExportacionInput): Promise<CrearExportacionResult> {
    if (input.tipo !== "FICHAJES" && input.tipo !== "FICHAJES_EMPRESAS") {
      return { outcome: "invalid-tipo" };
    }

    if (actorRole === "EMPLEADO") {
      // El router/action ya bloquea esto antes de llegar aquí (igual que
      // el resto de servicios); se deja como cinturón de seguridad.
      return { outcome: "invalid-tipo" };
    }

    const empresaId = actorRole === "GERENTE" ? null : input.empresaIdForm ?? null;
    // GERENTE: se resuelve su propia empresa (igual que la web usaba
    // session.user.empresaId).
    const actorEmpresaId =
      actorRole === "GERENTE"
        ? (await prisma.usuario.findUnique({ where: { id: actorId }, select: { empresaId: true } }))?.empresaId ?? ""
        : empresaId ?? "";

    if (input.tipo === "FICHAJES" && !actorEmpresaId) {
      return { outcome: "empresa-requerida" };
    }

    if (actorEmpresaId) {
      const empresa = await prisma.empresa.findUnique({ where: { id: actorEmpresaId }, select: { id: true } });
      if (!empresa) {
        return { outcome: "invalid-empresa" };
      }
    }

    const empleadoId = sanitizeId(input.filtros.empleadoId ?? "");
    if (empleadoId) {
      const empleado = await prisma.usuario.findUnique({
        where: { id: empleadoId },
        select: { id: true, empresaId: true },
      });
      if (!empleado) {
        return { outcome: "invalid-empleado" };
      }
      if (actorEmpresaId && empleado.empresaId !== actorEmpresaId) {
        return { outcome: "empleado-fuera-de-empresa" };
      }
    }

    const job = await prisma.exportacion.create({
      data: {
        tipo: input.tipo,
        estado: "PENDIENTE",
        solicitadoPorId: actorId,
        empresaId: actorEmpresaId || null,
        empleadoId: empleadoId || null,
        filtros: input.filtros as Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    void this.ensureExportJobProgress(job.id);

    return { outcome: "ok", jobId: job.id };
  }

  async obtenerExportacion(actorId: string, jobId: string): Promise<ExportacionStatus> {
    const safeJobId = sanitizeId(jobId);
    if (!safeJobId) {
      return { status: "ERROR", error: "Exportacion no encontrada" };
    }

    const job = await prisma.exportacion.findUnique({
      where: { id: safeJobId },
      select: {
        estado: true,
        archivoRuta: true,
        error: true,
        solicitadoPorId: true,
      },
    });

    if (!job) {
      return { status: "ERROR", error: "Exportacion no encontrada" };
    }

    if (job.solicitadoPorId !== actorId) {
      return { status: "ERROR", error: "No autorizado" };
    }

    if (job.estado === "PENDIENTE" || job.estado === "GENERANDO") {
      await this.ensureExportJobProgress(safeJobId);
      const refreshed = await prisma.exportacion.findUnique({
        where: { id: safeJobId },
        select: { estado: true, archivoRuta: true, error: true },
      });

      if (!refreshed) {
        return { status: "ERROR", error: "Exportacion no encontrada" };
      }

      if (refreshed.estado === "LISTO" && refreshed.archivoRuta) {
        const url = await createSignedUrl(refreshed.archivoRuta, 900, EXPORT_BUCKET);
        return { status: "LISTO", url };
      }

      return { status: refreshed.estado, error: refreshed.error ?? null };
    }

    if (job.estado === "LISTO" && job.archivoRuta) {
      const url = await createSignedUrl(job.archivoRuta, 900, EXPORT_BUCKET);
      return { status: "LISTO", url };
    }

    return { status: job.estado, error: job.error ?? null };
  }
}
