import { prisma } from "../../app/lib/prisma";
import type {
  ActualizarConfigInput,
  ActualizarConfigResult,
  CrearEmpresaInput,
  CrearEmpresaResult,
  EliminarEmpresaResult,
  EmpresaConfigSummary,
  EmpresaEntry,
  EmpresaService,
  ManagerRole,
} from "./types";

// Traslado 1:1 desde empresa-actions.ts (Fase 2.16).
export class PrismaEmpresaService implements EmpresaService {
  async listEmpresas(): Promise<EmpresaEntry[]> {
    const empresas = await prisma.empresa.findMany({
      select: {
        id: true,
        nombre: true,
        cif: true,
        pausaCuentaComoTrabajo: true,
        geolocalizacionFichaje: true,
        createdAt: true,
        _count: { select: { usuarios: true, departamentos: true, centrosTrabajo: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return empresas.map((e) => ({
      id: e.id,
      nombre: e.nombre,
      cif: e.cif,
      pausaCuentaComoTrabajo: e.pausaCuentaComoTrabajo,
      geolocalizacionFichaje: e.geolocalizacionFichaje,
      createdAt: e.createdAt,
      usuariosCount: e._count.usuarios,
      departamentosCount: e._count.departamentos,
      centrosTrabajoCount: e._count.centrosTrabajo,
    }));
  }

  async crearEmpresa(input: CrearEmpresaInput): Promise<CrearEmpresaResult> {
    const existente = await prisma.empresa.findFirst({
      where: {
        OR: [{ cif: input.cif }, { nombre: { equals: input.nombre, mode: "insensitive" } }],
      },
      select: { id: true, cif: true, nombre: true },
    });

    if (existente) {
      if (existente.cif === input.cif) {
        return { outcome: "cif-duplicado" };
      }
      return { outcome: "nombre-duplicado" };
    }

    await prisma.empresa.create({
      data: { nombre: input.nombre, cif: input.cif },
    });

    return { outcome: "ok" };
  }

  async eliminarEmpresa(empresaId: string): Promise<EliminarEmpresaResult> {
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: {
        id: true,
        _count: { select: { usuarios: true, departamentos: true, centrosTrabajo: true } },
      },
    });

    if (!empresa) {
      return { outcome: "not-found" };
    }

    const admins = await prisma.usuario.count({
      where: { empresaId, rol: "ADMIN_SISTEMA" },
    });

    if (admins > 0) {
      return { outcome: "has-admins" };
    }

    if (empresa._count.usuarios > 0 || empresa._count.departamentos > 0 || empresa._count.centrosTrabajo > 0) {
      return { outcome: "has-blockers" };
    }

    await prisma.empresa.delete({ where: { id: empresaId } });

    return { outcome: "ok" };
  }

  async actualizarConfig(
    actorId: string,
    actorRole: ManagerRole,
    empresaId: string,
    input: ActualizarConfigInput,
  ): Promise<ActualizarConfigResult> {
    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId }, select: { id: true } });
    if (!empresa) {
      return { outcome: "not-found" };
    }

    if (actorRole === "GERENTE") {
      const actor = await prisma.usuario.findUnique({ where: { id: actorId }, select: { empresaId: true } });
      if (!actor || actor.empresaId !== empresaId) {
        return { outcome: "forbidden" };
      }
    }

    await prisma.empresa.update({
      where: { id: empresaId },
      data: {
        pausaCuentaComoTrabajo: input.pausaCuentaComoTrabajo,
        geolocalizacionFichaje: input.geolocalizacionFichaje,
      },
    });

    return { outcome: "ok" };
  }

  // actorRole no cambia la resolución (GERENTE y ADMIN_SISTEMA resuelven
  // igual: la empresa del propio actor) — se mantiene en la firma por
  // coherencia con el resto del servicio y por si en el futuro hiciera
  // falta distinguir.
  async getMiEmpresaConfig(actorId: string, _actorRole: ManagerRole): Promise<EmpresaConfigSummary | null> {
    const actor = await prisma.usuario.findUnique({
      where: { id: actorId },
      select: {
        empresa: {
          select: { id: true, nombre: true, pausaCuentaComoTrabajo: true, geolocalizacionFichaje: true },
        },
      },
    });

    if (!actor?.empresa) {
      return null;
    }

    return {
      id: actor.empresa.id,
      nombre: actor.empresa.nombre,
      pausaCuentaComoTrabajo: actor.empresa.pausaCuentaComoTrabajo,
      geolocalizacionFichaje: actor.empresa.geolocalizacionFichaje,
    };
  }
}
