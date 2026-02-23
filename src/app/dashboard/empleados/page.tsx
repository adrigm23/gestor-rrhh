import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "../../api/auth/auth";
import { prisma } from "../../lib/prisma";
import { hashNfcUid, sanitizeNfcUid } from "../../utils/nfc";
import EmpleadosDirectory from "./empleados-directory";

type SearchParams = Record<string, string | string[] | undefined>;

const getParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function EmpleadosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user?.role === "EMPLEADO") {
    redirect("/dashboard");
  }

  const role = session.user?.role ?? "";
  const currentUserId = session.user?.id ?? "";
  const resolvedSearchParams = (await searchParams) ?? {};
  const query = (getParam(resolvedSearchParams.q) ?? "").trim();
  const empresaParam =
    role === "ADMIN_SISTEMA"
      ? (getParam(resolvedSearchParams.empresaId) ?? "")
      : "";
  const rolParamRaw = getParam(resolvedSearchParams.rol) ?? "todos";
  const rolParam =
    rolParamRaw === "EMPLEADO" || rolParamRaw === "GERENTE"
      ? rolParamRaw
      : "todos";
  const estadoParamRaw = getParam(resolvedSearchParams.estado) ?? "activos";
  const estadoParam =
    estadoParamRaw === "baja" || estadoParamRaw === "todos"
      ? estadoParamRaw
      : "activos";
  const estadoWhere =
    estadoParam === "baja"
      ? { activo: false }
      : estadoParam === "todos"
        ? {}
        : { activo: true };
  const gerenteEmpresaId =
    role === "GERENTE"
      ? (
          await prisma.usuario.findUnique({
            where: { id: session.user?.id ?? "" },
            select: { empresaId: true },
          })
        )?.empresaId ?? null
      : null;

  const pageParamRaw = getParam(resolvedSearchParams.page) ?? "1";
  const page = Math.max(1, Number.parseInt(pageParamRaw, 10) || 1);
  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  const nfcQuery = sanitizeNfcUid(query);
  let nfcHash: string | null = null;
  if (query && nfcQuery) {
    try {
      nfcHash = hashNfcUid(nfcQuery);
    } catch {
      nfcHash = null;
    }
  }

  const buildSearchFilters = (): Prisma.UsuarioWhereInput =>
    query
      ? {
          OR: [
            { nombre: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            ...(nfcHash ? [{ nfcUidHash: nfcHash }] : []),
          ],
        }
      : {};

  const whereClause: Prisma.UsuarioWhereInput =
    role === "ADMIN_SISTEMA"
      ? {
          rol:
            rolParam === "todos"
              ? { in: ["EMPLEADO", "GERENTE"] }
              : rolParam,
          ...(empresaParam ? { empresaId: empresaParam } : {}),
          ...estadoWhere,
          ...buildSearchFilters(),
        }
      : gerenteEmpresaId
        ? {
            rol: "EMPLEADO",
            empresaId: gerenteEmpresaId,
            ...estadoWhere,
            ...buildSearchFilters(),
          }
        : { rol: "EMPLEADO", id: "__none__" };

  const usuarios = await prisma.usuario.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    skip,
    take: pageSize,
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      activo: true,
      fechaBaja: true,
      createdAt: true,
      nfcUidHash: true,
      passwordMustChange: true,
      empresaId: true,
      empresa: { select: { nombre: true } },
      departamento: { select: { nombre: true } },
      contratos: {
        orderBy: { fechaInicio: "desc" },
        take: 1,
        select: { horasSemanales: true, fechaInicio: true },
      },
    },
  });

  const totalUsuarios = await prisma.usuario.count({
    where: whereClause,
  });

  const departamentos = await prisma.departamento.findMany({
    where:
      role === "ADMIN_SISTEMA"
        ? {}
        : gerenteEmpresaId
          ? { empresaId: gerenteEmpresaId }
          : { id: "__none__" },
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      empresaId: true,
      empresa: { select: { nombre: true } },
    },
  });

  const empresas =
    role === "ADMIN_SISTEMA"
      ? await prisma.empresa.findMany({
          select: { id: true, nombre: true },
          orderBy: { nombre: "asc" },
        })
      : [];

  return (
    <EmpleadosDirectory
      role={role}
      currentUserId={currentUserId}
      query={query}
      estadoParam={estadoParam}
      rolParam={rolParam}
      empresaParam={empresaParam}
      usuarios={usuarios}
      totalUsuarios={totalUsuarios}
      page={page}
      pageSize={pageSize}
      empresas={empresas}
      departamentos={departamentos}
    />
  );
}

