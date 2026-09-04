import { prisma } from "../../app/lib/prisma";
import type {
  CreateModificacionInput,
  CreateModificacionResult,
  FichajeOption,
  ManagerRole,
  ModificacionFichajeService,
  RespondAccion,
  RespondModificacionResult,
  SolicitudModificacionFichajeEntry,
  SolicitudModificacionManagerEntry,
} from "./types";

// Traslado 1:1 desde modificacion-fichaje-actions.ts (responderSolicitudModificacion):
// mismas reglas de validación de rango/solape, sin cambiar comportamiento.
// crearSolicitudModificacion (GERENTE/ADMIN, fuera de alcance de esta fase)
// mantiene sus propias copias locales de estos helpers — no se tocan.
const isInvalidRange = (entrada: Date | null, salida: Date | null) =>
  Boolean(entrada && salida && salida.getTime() <= entrada.getTime());

const hasOverlap = async (
  usuarioId: string,
  entrada: Date | null,
  salida: Date | null,
  excludeId?: string | null,
) => {
  if (!entrada) return false;

  const excludeClause = excludeId ? { not: excludeId } : undefined;
  const baseWhere = {
    usuarioId,
    tipo: "JORNADA" as const,
    ...(excludeClause ? { id: excludeClause } : {}),
  };

  if (!salida) {
    const open = await prisma.fichaje.findFirst({
      where: { ...baseWhere, salida: null },
      select: { id: true },
    });
    return Boolean(open);
  }

  const overlap = await prisma.fichaje.findFirst({
    where: {
      ...baseWhere,
      OR: [
        { salida: null, entrada: { lt: salida } },
        { entrada: { lt: salida }, salida: { gt: entrada } },
      ],
    },
    select: { id: true },
  });

  return Boolean(overlap);
};

export class PrismaModificacionFichajeService implements ModificacionFichajeService {
  async listPending(empleadoId: string, limit = 10): Promise<SolicitudModificacionFichajeEntry[]> {
    const rows = await prisma.solicitudModificacionFichaje.findMany({
      where: { empleadoId, estado: "PENDIENTE" },
      include: {
        solicitante: { select: { nombre: true, email: true } },
        fichaje: { select: { entrada: true, salida: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return rows.map((item) => ({
      id: item.id,
      solicitanteNombre: item.solicitante.nombre,
      solicitanteEmail: item.solicitante.email,
      fichajeEntrada: item.fichaje?.entrada ?? null,
      fichajeSalida: item.fichaje?.salida ?? null,
      entradaPropuesta: item.entradaPropuesta,
      salidaPropuesta: item.salidaPropuesta,
      motivo: item.motivo,
      createdAt: item.createdAt,
    }));
  }

  async respond(
    empleadoId: string,
    solicitudId: string,
    accion: RespondAccion,
  ): Promise<RespondModificacionResult> {
    const solicitud = await prisma.solicitudModificacionFichaje.findUnique({
      where: { id: solicitudId },
      include: {
        fichaje: { select: { id: true, usuarioId: true, entrada: true, salida: true } },
      },
    });

    if (!solicitud || solicitud.empleadoId !== empleadoId) {
      return { outcome: "not-found" };
    }

    if (solicitud.estado !== "PENDIENTE") {
      return { outcome: "already-responded" };
    }

    if (accion === "RECHAZADA") {
      await prisma.solicitudModificacionFichaje.update({
        where: { id: solicitud.id },
        data: { estado: "RECHAZADA", respondedAt: new Date(), respondidoPorId: empleadoId },
      });
      return { outcome: "ok" };
    }

    const entradaPropuesta = solicitud.entradaPropuesta ?? null;
    const salidaPropuesta = solicitud.salidaPropuesta ?? null;

    if (!entradaPropuesta && !salidaPropuesta) {
      return { outcome: "no-hours-proposed" };
    }

    if (solicitud.fichajeId) {
      const fichajeActual = solicitud.fichaje
        ? { entrada: solicitud.fichaje.entrada, salida: solicitud.fichaje.salida }
        : null;
      const entradaFinal = entradaPropuesta ?? fichajeActual?.entrada ?? null;
      const salidaFinal = salidaPropuesta ?? fichajeActual?.salida ?? null;

      if (!entradaFinal) {
        return { outcome: "entrada-required-for-update" };
      }

      if (isInvalidRange(entradaFinal, salidaFinal)) {
        return { outcome: "invalid-range" };
      }

      if (await hasOverlap(empleadoId, entradaFinal, salidaFinal, solicitud.fichajeId)) {
        return { outcome: "overlap" };
      }

      const updateData: {
        entrada?: Date;
        salida?: Date | null;
        editado?: boolean;
        motivoEdicion?: string | null;
        editadoPorId?: string | null;
      } = {
        editado: true,
        motivoEdicion: solicitud.motivo ?? null,
        editadoPorId: empleadoId,
      };

      if (entradaPropuesta) updateData.entrada = entradaPropuesta;
      if (salidaPropuesta) updateData.salida = salidaPropuesta;

      await prisma.fichaje.update({ where: { id: solicitud.fichajeId }, data: updateData });
    } else {
      if (!entradaPropuesta) {
        return { outcome: "entrada-required-for-create" };
      }

      if (isInvalidRange(entradaPropuesta, salidaPropuesta)) {
        return { outcome: "invalid-range" };
      }

      if (await hasOverlap(empleadoId, entradaPropuesta, salidaPropuesta, null)) {
        return { outcome: "overlap" };
      }

      await prisma.fichaje.create({
        data: {
          usuarioId: empleadoId,
          entrada: entradaPropuesta,
          salida: salidaPropuesta,
          tipo: "JORNADA",
          editado: true,
          motivoEdicion: solicitud.motivo ?? null,
          editadoPorId: empleadoId,
        },
      });
    }

    await prisma.solicitudModificacionFichaje.update({
      where: { id: solicitud.id },
      data: { estado: "ACEPTADA", respondedAt: new Date(), respondidoPorId: empleadoId },
    });

    return { outcome: "ok" };
  }

  private async resolveGerenteEmpresaId(actorId: string): Promise<string | null> {
    const gerente = await prisma.usuario.findUnique({
      where: { id: actorId },
      select: { empresaId: true },
    });
    return gerente?.empresaId ?? null;
  }

  // Confirma que `empleadoId` es un EMPLEADO dentro del alcance del actor
  // (GERENTE: su empresa; ADMIN_SISTEMA: cualquiera). `null` = fuera de
  // alcance o no es un empleado válido.
  private async resolveEmpleadoEnAlcance(
    actorId: string,
    actorRole: ManagerRole,
    empleadoId: string,
  ): Promise<{ id: string } | null> {
    const empresaId = actorRole === "GERENTE" ? await this.resolveGerenteEmpresaId(actorId) : null;
    if (actorRole === "GERENTE" && !empresaId) return null;

    const empleado = await prisma.usuario.findUnique({
      where: { id: empleadoId },
      select: { rol: true, empresaId: true },
    });
    if (!empleado || empleado.rol !== "EMPLEADO") return null;
    if (empresaId && empleado.empresaId !== empresaId) return null;

    return { id: empleadoId };
  }

  // Traslado 1:1 desde modificacion-fichajes/page.tsx (query "fichajes"),
  // acotado a un único empleado (aquí el picker es por empleado, no una
  // tabla global de hasta 50 fichajes de toda la empresa).
  async listFichajesForEmpleado(
    actorId: string,
    actorRole: ManagerRole,
    empleadoId: string,
    limit = 20,
  ): Promise<FichajeOption[] | null> {
    const empleado = await this.resolveEmpleadoEnAlcance(actorId, actorRole, empleadoId);
    if (!empleado) return null;

    const rows = await prisma.fichaje.findMany({
      where: { usuarioId: empleadoId },
      select: { id: true, entrada: true, salida: true },
      orderBy: { entrada: "desc" },
      take: limit,
    });

    return rows;
  }

  // Traslado 1:1 desde modificacion-fichaje-actions.ts (crearSolicitudModificacion).
  async create(
    actorId: string,
    actorRole: ManagerRole,
    input: CreateModificacionInput,
  ): Promise<CreateModificacionResult> {
    const empleado = await this.resolveEmpleadoEnAlcance(actorId, actorRole, input.empleadoId);
    if (!empleado) {
      // No se distingue "no existe" de "fuera de tu empresa" en el mismo
      // chequeo que ya hacía la web (evita filtrar qué empleados existen).
      const existe = await prisma.usuario.findUnique({
        where: { id: input.empleadoId },
        select: { rol: true },
      });
      return existe && existe.rol === "EMPLEADO"
        ? { outcome: "employee-out-of-scope" }
        : { outcome: "invalid-employee" };
    }

    let fichajeTargetId: string | null = null;
    if (input.fichajeId) {
      const fichaje = await prisma.fichaje.findUnique({
        where: { id: input.fichajeId },
        select: { id: true, usuarioId: true },
      });
      if (!fichaje || fichaje.usuarioId !== input.empleadoId) {
        return { outcome: "invalid-fichaje" };
      }
      fichajeTargetId = fichaje.id;
    }

    await prisma.solicitudModificacionFichaje.create({
      data: {
        empleadoId: input.empleadoId,
        solicitanteId: actorId,
        fichajeId: fichajeTargetId,
        entradaPropuesta: input.entradaPropuesta,
        salidaPropuesta: input.salidaPropuesta,
        motivo: input.motivo,
      },
    });

    return { outcome: "ok" };
  }

  // Traslado 1:1 desde modificacion-fichajes/page.tsx (query "solicitudes").
  async listRecentForManager(
    actorId: string,
    actorRole: ManagerRole,
    limit = 20,
  ): Promise<SolicitudModificacionManagerEntry[]> {
    const empresaId = actorRole === "GERENTE" ? await this.resolveGerenteEmpresaId(actorId) : null;
    if (actorRole === "GERENTE" && !empresaId) return [];

    const rows = await prisma.solicitudModificacionFichaje.findMany({
      where: empresaId ? { empleado: { empresaId } } : {},
      include: { empleado: { select: { nombre: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return rows.map((item) => ({
      id: item.id,
      empleadoNombre: item.empleado.nombre,
      empleadoEmail: item.empleado.email,
      estado: item.estado,
      entradaPropuesta: item.entradaPropuesta,
      salidaPropuesta: item.salidaPropuesta,
      motivo: item.motivo,
      createdAt: item.createdAt,
    }));
  }
}
