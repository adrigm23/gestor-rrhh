import { Prisma, TipoFichaje } from "@prisma/client";
import { auth } from "../../auth/auth";
import { prisma } from "../../../lib/prisma";
import { formatAppDateTime } from "../../../utils/datetime";
import {
  sanitizeId,
  sanitizeString,
  sanitizeUrlSearchParam,
} from "../../../utils/input";

const parseDate = (value: string | null, endOfDay: boolean) => {
  if (!value) return null;
  const suffix = endOfDay ? "T23:59:59" : "T00:00:00";
  const date = new Date(`${value}${suffix}`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatTipo = (tipo: TipoFichaje) => {
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

const toTipoFichaje = (value: string) => {
  const allowed: TipoFichaje[] = ["JORNADA", "PAUSA_COMIDA", "DESCANSO", "MEDICO"];
  return allowed.includes(value as TipoFichaje)
    ? (value as TipoFichaje)
    : undefined;
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
  const needsEscape =
    guarded.includes(",") || guarded.includes("\"") || guarded.includes("\n");
  if (!needsEscape) return guarded;
  return `"${guarded.replace(/"/g, "\"\"")}"`;
};

const sanitizeFilenamePart = (value: string | null, fallback: string) => {
  const cleaned = sanitizeString(value, { maxLength: 32 }).replace(
    /[^a-zA-Z0-9_-]/g,
    "",
  );
  return cleaned || fallback;
};

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("No autorizado", { status: 401 });
  }

  const role = session.user?.role ?? "";
  if (role === "EMPLEADO") {
    return new Response("No autorizado", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const fromParam =
    sanitizeUrlSearchParam(searchParams, "from", { maxLength: 10 }) || null;
  const toParam =
    sanitizeUrlSearchParam(searchParams, "to", { maxLength: 10 }) || null;
  const empleadoParam = sanitizeId(
    sanitizeUrlSearchParam(searchParams, "empleadoId"),
  );
  const estadoParam =
    sanitizeUrlSearchParam(searchParams, "estado").toLowerCase() || "todos";
  const tipoParam =
    sanitizeUrlSearchParam(searchParams, "tipo").toUpperCase() || "TODOS";
  const empresaParam = sanitizeId(
    sanitizeUrlSearchParam(searchParams, "empresaId"),
  );
  const limitParam = sanitizeUrlSearchParam(searchParams, "limit", {
    maxLength: 10,
  });
  const defaultLimit = 2000;
  const maxLimit = 5000;
  const parsedLimit = Number.parseInt(limitParam ?? "", 10);
  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, maxLimit)
      : defaultLimit;

  const gerenteEmpresaId =
    role === "GERENTE"
      ? (
          await prisma.usuario.findUnique({
            where: { id: session.user.id },
            select: { empresaId: true },
          })
        )?.empresaId ?? null
      : null;

  const empresaFiltro = role === "ADMIN_SISTEMA" ? empresaParam : gerenteEmpresaId ?? "";

  if (!empresaFiltro) {
    return new Response("Empresa requerida", { status: 400 });
  }

  let desde = parseDate(fromParam, false);
  let hasta = parseDate(toParam, true);
  if (desde && hasta && hasta < desde) {
    const temp = desde;
    desde = hasta;
    hasta = temp;
  }

  const whereClause: Prisma.FichajeWhereInput = {
    usuario: { empresaId: empresaFiltro },
  };

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

  if (tipoParam !== "TODOS") {
    const tipo = toTipoFichaje(tipoParam);
    if (tipo) {
      whereClause.tipo = tipo;
    }
  }

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
    take: limit,
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
  const filename = `fichajes-${sanitizeFilenamePart(fromParam, "inicio")}-${sanitizeFilenamePart(toParam, "fin")}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Export-Limit": String(limit),
    },
  });
}
