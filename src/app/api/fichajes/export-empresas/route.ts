import { Prisma, TipoFichaje } from "@prisma/client";
import { auth } from "../../auth/auth";
import { prisma } from "../../../lib/prisma";

const parseDate = (value: string | null, endOfDay: boolean) => {
  if (!value) return null;
  const suffix = endOfDay ? "T23:59:59" : "T00:00:00";
  const date = new Date(`${value}${suffix}`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toTipoFichaje = (value: string) => {
  const allowed: TipoFichaje[] = ["JORNADA", "PAUSA_COMIDA", "DESCANSO", "MEDICO"];
  return allowed.includes(value as TipoFichaje)
    ? (value as TipoFichaje)
    : undefined;
};

const escapeCsv = (value: string) => {
  const needsEscape = value.includes(",") || value.includes("\"") || value.includes("\n");
  if (!needsEscape) return value;
  return `"${value.replace(/"/g, "\"\"")}"`;
};

const formatTotalMinutes = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const padded = (value: number) => value.toString().padStart(2, "0");
  return `${padded(hours)}:${padded(minutes)} Hrs`;
};

const diffMinutes = (entrada: Date, salida?: Date | null) => {
  if (!salida) return 0;
  const diffMs = Math.max(0, salida.getTime() - entrada.getTime());
  return Math.floor(diffMs / 60000);
};

type EmpresaResumen = {
  id: string;
  nombre: string;
  cif: string;
  total: number;
  abiertos: number;
  cerrados: number;
  editados: number;
  minutos: number;
  empleados: Set<string>;
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
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const estadoParam = searchParams.get("estado") ?? "todos";
  const tipoParam = searchParams.get("tipo") ?? "todos";
  const empresaParam = searchParams.get("empresaId") ?? "";

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

  if (role !== "ADMIN_SISTEMA" && !empresaFiltro) {
    return new Response("Empresa requerida", { status: 400 });
  }

  let desde = parseDate(fromParam, false);
  let hasta = parseDate(toParam, true);
  if (desde && hasta && hasta < desde) {
    const temp = desde;
    desde = hasta;
    hasta = temp;
  }

  const whereClause: Prisma.FichajeWhereInput = {};

  if (empresaFiltro) {
    whereClause.usuario = { empresaId: empresaFiltro };
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
    const tipo = toTipoFichaje(tipoParam);
    if (tipo) {
      whereClause.tipo = tipo;
    }
  }

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

  const resumen = new Map<string, EmpresaResumen>();

  for (const fichaje of fichajes) {
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

  const rows = [...resumen.values()]
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

  const csv = [header, ...rows].join("\n");
  const filename = `fichajes-empresas-${fromParam ?? "inicio"}-${toParam ?? "fin"}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
