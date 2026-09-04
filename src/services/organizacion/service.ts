import { prisma } from "../../app/lib/prisma";
import type {
  CentroTrabajoEntry,
  CrearCentroTrabajoInput,
  CrearCentroTrabajoResult,
  CrearDepartamentoInput,
  CrearDepartamentoResult,
  DepartamentoEntry,
  GerenteOption,
  ManagerRole,
  OrganizacionService,
  UpdateCentroDireccionResult,
} from "./types";

// Traslado 1:1 desde organizacion-actions.ts (Fase 2.14).
export class PrismaOrganizacionService implements OrganizacionService {
  private async resolveGerenteEmpresaId(actorId: string): Promise<string | null> {
    const actor = await prisma.usuario.findUnique({
      where: { id: actorId },
      select: { empresaId: true },
    });
    return actor?.empresaId ?? null;
  }

  private async resolveEmpresaScope(actorId: string, actorRole: ManagerRole): Promise<string | null> {
    // null = sin acotar (ADMIN_SISTEMA ve/opera sobre cualquier empresa).
    if (actorRole === "ADMIN_SISTEMA") return null;
    return this.resolveGerenteEmpresaId(actorId);
  }

  async listCentros(actorId: string, actorRole: ManagerRole): Promise<CentroTrabajoEntry[]> {
    const empresaId = await this.resolveEmpresaScope(actorId, actorRole);

    const centros = await prisma.centroTrabajo.findMany({
      where: empresaId ? { empresaId } : undefined,
      include: {
        gerente: { select: { nombre: true } },
        empresa: { select: { nombre: true } },
        _count: { select: { departamentos: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return centros.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      direccion: c.direccion,
      gerenteNombre: c.gerente?.nombre ?? null,
      empresaNombre: c.empresa?.nombre ?? null,
      departamentosCount: c._count.departamentos,
    }));
  }

  async listDepartamentos(actorId: string, actorRole: ManagerRole): Promise<DepartamentoEntry[]> {
    const empresaId = await this.resolveEmpresaScope(actorId, actorRole);

    const departamentos = await prisma.departamento.findMany({
      where: empresaId ? { empresaId } : undefined,
      include: {
        gerente: { select: { nombre: true } },
        centroTrabajo: { select: { nombre: true } },
        empresa: { select: { nombre: true } },
        _count: { select: { empleados: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return departamentos.map((d) => ({
      id: d.id,
      nombre: d.nombre,
      gerenteNombre: d.gerente?.nombre ?? null,
      centroTrabajoNombre: d.centroTrabajo?.nombre ?? null,
      empresaNombre: d.empresa?.nombre ?? null,
      empleadosCount: d._count.empleados,
    }));
  }

  async listGerentesOptions(actorId: string, actorRole: ManagerRole): Promise<GerenteOption[]> {
    const empresaId = await this.resolveEmpresaScope(actorId, actorRole);

    const gerentes = await prisma.usuario.findMany({
      where: {
        rol: "GERENTE",
        ...(empresaId ? { empresaId } : {}),
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        empresa: { select: { nombre: true } },
      },
      orderBy: { nombre: "asc" },
    });

    return gerentes.map((g) => ({
      id: g.id,
      nombre: g.nombre,
      email: g.email,
      empresaNombre: g.empresa?.nombre ?? null,
    }));
  }

  async crearCentroTrabajo(
    actorId: string,
    actorRole: ManagerRole,
    input: CrearCentroTrabajoInput,
  ): Promise<CrearCentroTrabajoResult> {
    const empresaId = actorRole === "ADMIN_SISTEMA" ? input.empresaId : await this.resolveGerenteEmpresaId(actorId);
    if (!empresaId) {
      return { outcome: "empresa-requerida" };
    }

    if (input.gerenteId) {
      const gerente = await prisma.usuario.findUnique({
        where: { id: input.gerenteId },
        select: { rol: true, empresaId: true },
      });
      if (!gerente || gerente.rol !== "GERENTE" || gerente.empresaId !== empresaId) {
        return { outcome: "gerente-invalido" };
      }
    }

    const existente = await prisma.centroTrabajo.findFirst({
      where: { empresaId, nombre: { equals: input.nombre, mode: "insensitive" } },
      select: { id: true },
    });
    if (existente) {
      return { outcome: "nombre-duplicado" };
    }

    await prisma.centroTrabajo.create({
      data: {
        nombre: input.nombre,
        empresaId,
        gerenteId: input.gerenteId,
        ...(input.direccion ? { direccion: input.direccion } : {}),
      },
    });

    return { outcome: "ok" };
  }

  async crearDepartamento(
    actorId: string,
    actorRole: ManagerRole,
    input: CrearDepartamentoInput,
  ): Promise<CrearDepartamentoResult> {
    const empresaId = actorRole === "ADMIN_SISTEMA" ? input.empresaId : await this.resolveGerenteEmpresaId(actorId);
    if (!empresaId) {
      return { outcome: "empresa-requerida" };
    }

    if (input.gerenteId) {
      const gerente = await prisma.usuario.findUnique({
        where: { id: input.gerenteId },
        select: { rol: true, empresaId: true },
      });
      if (!gerente || gerente.rol !== "GERENTE" || gerente.empresaId !== empresaId) {
        return { outcome: "gerente-invalido" };
      }
    }

    if (input.centroTrabajoId) {
      const centro = await prisma.centroTrabajo.findUnique({
        where: { id: input.centroTrabajoId },
        select: { empresaId: true },
      });
      if (!centro || centro.empresaId !== empresaId) {
        return { outcome: "centro-invalido" };
      }
    }

    const existente = await prisma.departamento.findFirst({
      where: { empresaId, nombre: { equals: input.nombre, mode: "insensitive" } },
      select: { id: true },
    });
    if (existente) {
      return { outcome: "nombre-duplicado" };
    }

    await prisma.departamento.create({
      data: {
        nombre: input.nombre,
        empresaId,
        gerenteId: input.gerenteId,
        centroTrabajoId: input.centroTrabajoId,
      },
    });

    return { outcome: "ok" };
  }

  async updateCentroDireccion(
    actorId: string,
    actorRole: ManagerRole,
    centroId: string,
    direccion: string | null,
  ): Promise<UpdateCentroDireccionResult> {
    const centro = await prisma.centroTrabajo.findUnique({
      where: { id: centroId },
      select: { empresaId: true },
    });
    if (!centro) {
      return { outcome: "not-found" };
    }

    if (actorRole === "GERENTE") {
      const empresaId = await this.resolveGerenteEmpresaId(actorId);
      if (!empresaId || empresaId !== centro.empresaId) {
        return { outcome: "out-of-scope" };
      }
    }

    await prisma.centroTrabajo.update({
      where: { id: centroId },
      data: { direccion: direccion || null },
    });

    return { outcome: "ok" };
  }
}
