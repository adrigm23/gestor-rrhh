import { Prisma } from "@prisma/client";
import { prisma } from "../../app/lib/prisma";
import type {
  EmpleadoPorEmpresaOption,
  FichajeEmpresaEntry,
  FichajesEmpresaService,
  ListFichajesEmpresaFilters,
  ListFichajesEmpresaResult,
  ManagerRole,
} from "./types";

const LIST_TAKE = 200;

// Traslado 1:1 desde dashboard/fichajes/page.tsx (Fase 2.15).
export class PrismaFichajesEmpresaService implements FichajesEmpresaService {
  private async resolveGerenteEmpresaId(actorId: string): Promise<string | null> {
    const actor = await prisma.usuario.findUnique({
      where: { id: actorId },
      select: { empresaId: true },
    });
    return actor?.empresaId ?? null;
  }

  async listFichajes(
    actorId: string,
    actorRole: ManagerRole,
    filters: ListFichajesEmpresaFilters,
  ): Promise<ListFichajesEmpresaResult> {
    let empresaFiltro: string | null;
    if (actorRole === "GERENTE") {
      empresaFiltro = await this.resolveGerenteEmpresaId(actorId);
      if (!empresaFiltro) {
        return { fichajes: [], total: 0, canQuery: false };
      }
    } else {
      empresaFiltro = filters.empresaId ?? null;
    }

    const whereClause: Prisma.FichajeWhereInput = {};

    if (empresaFiltro) {
      whereClause.usuario = { empresaId: empresaFiltro };
    }

    if (filters.empleadoId) {
      whereClause.usuarioId = filters.empleadoId;
    }

    if (filters.desde || filters.hasta) {
      whereClause.entrada = {
        ...(filters.desde ? { gte: filters.desde } : {}),
        ...(filters.hasta ? { lte: filters.hasta } : {}),
      };
    }

    if (filters.estado === "abierto") {
      whereClause.salida = { equals: null };
    } else if (filters.estado === "cerrado") {
      whereClause.salida = { not: null };
    }

    if (filters.tipo && filters.tipo !== "todos") {
      whereClause.tipo = filters.tipo;
    }

    const [fichajes, total] = await Promise.all([
      prisma.fichaje.findMany({
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
        take: LIST_TAKE,
      }),
      prisma.fichaje.count({ where: whereClause }),
    ]);

    const entries: FichajeEmpresaEntry[] = fichajes.map((f) => ({
      id: f.id,
      empleadoNombre: f.usuario.nombre,
      empleadoEmail: f.usuario.email,
      empresaNombre: f.usuario.empresa?.nombre ?? null,
      entrada: f.entrada,
      salida: f.salida,
      tipo: f.tipo,
      editado: f.editado,
    }));

    return { fichajes: entries, total, canQuery: true };
  }

  async listEmpleadosPorEmpresa(
    actorId: string,
    actorRole: ManagerRole,
    empresaId: string,
  ): Promise<EmpleadoPorEmpresaOption[]> {
    const scopedEmpresaId =
      actorRole === "GERENTE" ? await this.resolveGerenteEmpresaId(actorId) : empresaId;

    if (!scopedEmpresaId) return [];

    const empleados = await prisma.usuario.findMany({
      where: { rol: "EMPLEADO", empresaId: scopedEmpresaId },
      select: { id: true, nombre: true, email: true },
      orderBy: { nombre: "asc" },
    });

    return empleados;
  }
}
