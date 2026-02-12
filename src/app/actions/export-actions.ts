"use server";

import { Prisma, TipoFichaje } from "@prisma/client";
import { auth } from "../api/auth/auth";
import { prisma } from "../lib/prisma";
import { createSignedUrl, uploadExportCsv } from "../lib/supabase-storage";

export type ExportacionState = {
  status: "idle" | "error" | "success";
  message?: string;
  jobId?: string;
};

export type ExportacionStatus = {
  status: "PENDIENTE" | "GENERANDO" | "LISTO" | "ERROR";
  url?: string | null;
  error?: string | null;
};

const emptySuccess: ExportacionState = { status: "success" };
const emptyError: ExportacionState = { status: "error" };

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
  const needsEscape =
    value.includes(",") || value.includes("\"") || value.includes("\n");
  if (!needsEscape) return value;
  return `"${value.replace(/"/g, "\"\"")}"`;
};

type ExportFilters = {
  from?: string;
  to?: string;
  estado?: string;
  tipo?: string;
  empresaId?: string;
  empleadoId?: string;
};

const buildWhereClause = (filters: ExportFilters, empresaId?: string | null) => {
  const fromParam = filters.from ?? null;
  const toParam = filters.to ?? null;
  const estadoParam = filters.estado ?? "todos";
  const tipoParam = filters.tipo ?? "todos";
  const empleadoParam = filters.empleadoId ?? "";

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

  if (tipoParam !== "todos") {
    const allowed: TipoFichaje[] = [
      "JORNADA",
      "PAUSA_COMIDA",
      "DESCANSO",
      "MEDICO",
    ];
    if (allowed.includes(tipoParam as TipoFichaje)) {
      whereClause.tipo = tipoParam as TipoFichaje;
    }
  }

  return { whereClause, desde, hasta, estadoParam, tipoParam };
};

const buildEmpresaResumen = (items: {
  entrada: Date;
  salida: Date | null;
  editado: boolean;
  usuarioId: string;
  usuario: { empresa: { id: string; nombre: string; cif: string } | null };
}[]) => {
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

const runExportJob = async (jobId: string) => {
  try {
    const job = await prisma.exportacion.findUnique({
      where: { id: jobId },
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
      where: { id: jobId },
      data: { estado: "GENERANDO", error: null },
    });

    const user = await prisma.usuario.findUnique({
      where: { id: job.solicitadoPorId },
      select: { rol: true, empresaId: true },
    });

    if (!user || user.rol === "EMPLEADO") {
      throw new Error("No autorizado");
    }

    const filtros = (job.filtros ?? {}) as ExportFilters;

    const empresaFiltro =
      user.rol === "GERENTE" ? user.empresaId ?? "" : job.empresaId ?? "";

    if (job.tipo === "FICHAJES" && !empresaFiltro) {
      throw new Error("Empresa requerida para exportar fichajes.");
    }

    if (job.tipo === "FICHAJES") {
      const { whereClause, desde, hasta } = buildWhereClause(
        filtros,
        empresaFiltro,
      );

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
      });

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
          item.entrada.toLocaleString("es-ES"),
          item.salida ? item.salida.toLocaleString("es-ES") : "En curso",
          formatDuration(item.entrada, item.salida),
          formatTipo(item.tipo),
          item.salida ? "Cerrado" : "Abierto",
          item.editado ? "Si" : "No",
          item.motivoEdicion ?? "",
        ];
        return values.map((value) => escapeCsv(String(value))).join(",");
      });

      const csv = [header, ...rows].join("\n");
      const filename = `exports/${job.id}/fichajes-${filtros.from ?? "inicio"}-${filtros.to ?? "fin"}.csv`;

      await uploadExportCsv(csv, filename);

      await prisma.exportacion.update({
        where: { id: job.id },
        data: { estado: "LISTO", archivoRuta: filename },
      });
      return;
    }

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
    });

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
    const filename = `exports/${job.id}/fichajes-empresas-${filtros.from ?? "inicio"}-${filtros.to ?? "fin"}.csv`;

    await uploadExportCsv(csv, filename);

    await prisma.exportacion.update({
      where: { id: job.id },
      data: { estado: "LISTO", archivoRuta: filename },
    });
  } catch (error) {
    await prisma.exportacion.update({
      where: { id: jobId },
      data: {
        estado: "ERROR",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
    });
  }
};

export async function crearExportacion(
  _prevState: ExportacionState,
  formData: FormData,
): Promise<ExportacionState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { ...emptyError, message: "No autorizado." };
  }

  const tipo = formData.get("tipo")?.toString() ?? "FICHAJES";
  if (tipo !== "FICHAJES" && tipo !== "FICHAJES_EMPRESAS") {
    return { ...emptyError, message: "Tipo invalido." };
  }

  const role = session.user?.role ?? "";
  if (role === "EMPLEADO") {
    return { ...emptyError, message: "No autorizado." };
  }

  const empresaIdForm = formData.get("empresaId")?.toString() ?? "";
  const empleadoId = formData.get("empleadoId")?.toString() ?? "";

  const filtros: ExportFilters = {
    from: formData.get("from")?.toString() ?? undefined,
    to: formData.get("to")?.toString() ?? undefined,
    estado: formData.get("estado")?.toString() ?? "todos",
    tipo: formData.get("tipoFiltro")?.toString() ?? "todos",
    empresaId: empresaIdForm || undefined,
    empleadoId: empleadoId || undefined,
  };

  const empresaId =
    role === "GERENTE" ? session.user.empresaId ?? "" : empresaIdForm;

  if (tipo === "FICHAJES" && !empresaId) {
    return { ...emptyError, message: "Selecciona una empresa." };
  }

  const job = await prisma.exportacion.create({
    data: {
      tipo,
      estado: "PENDIENTE",
      solicitadoPorId: session.user.id,
      empresaId: empresaId || null,
      empleadoId: empleadoId || null,
      filtros,
    },
    select: { id: true },
  });

  void runExportJob(job.id);

  return { ...emptySuccess, jobId: job.id };
}

export async function obtenerExportacion(jobId: string): Promise<ExportacionStatus> {
  const session = await auth();

  if (!session?.user?.id) {
    return { status: "ERROR", error: "No autorizado" };
  }

  const job = await prisma.exportacion.findUnique({
    where: { id: jobId },
    select: {
      estado: true,
      archivoRuta: true,
      error: true,
      solicitadoPorId: true,
      empresaId: true,
    },
  });

  if (!job) {
    return { status: "ERROR", error: "Exportacion no encontrada" };
  }

  if (job.solicitadoPorId !== session.user.id) {
    return { status: "ERROR", error: "No autorizado" };
  }

  if (job.estado === "LISTO" && job.archivoRuta) {
    const url = await createSignedUrl(job.archivoRuta, 900);
    return { status: "LISTO", url };
  }

  return { status: job.estado, error: job.error ?? null };
}
