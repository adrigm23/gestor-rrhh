import { prisma } from "../../app/lib/prisma";
import { comparePassword, hashPassword } from "../../app/utils/password";
import { hashNfcUid, sanitizeNfcUid } from "../../app/utils/nfc";
import { authService } from "../auth";
import type {
  AdminTargetResult,
  CambiarEmpresaUsuarioResult,
  ChangePasswordResult,
  CreateUsuarioInput,
  CreateUsuarioResult,
  CrearContratoInput,
  CrearContratoResult,
  DepartamentoOption,
  DirectoryEntry,
  EliminarUsuarioResult,
  EmpleadoOption,
  EmpresaOption,
  EstadoAccion,
  ListDirectoryFilters,
  ListDirectoryResult,
  ManagerRole,
  UpdateDniAdminResult,
  UpdateEmailAdminResult,
  UpdateEstadoResult,
  UpdateProfileResult,
  UsuarioProfile,
  UsuarioService,
} from "./types";

function toProfile(row: {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  empresa: { geolocalizacionFichaje: boolean } | null;
}): UsuarioProfile {
  return {
    id: row.id,
    nombre: row.nombre,
    email: row.email,
    rol: row.rol as UsuarioProfile["rol"],
    geolocalizacionFichaje: row.empresa?.geolocalizacionFichaje ?? false,
  };
}

// Traslado 1:1 desde admin-actions.ts.
const DNI_REGEX = /^(\d{8}|[XYZ]\d{7})[A-Z]$/;
const DNI_LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE";

function normalizeDni(value: string): string {
  return value.trim().toUpperCase().replace(/[-\s]/g, "");
}

function isValidDni(dni: string): boolean {
  if (!DNI_REGEX.test(dni)) return false;
  const prefix = dni[0];
  const numericPartRaw =
    prefix === "X"
      ? `0${dni.slice(1, 8)}`
      : prefix === "Y"
        ? `1${dni.slice(1, 8)}`
        : prefix === "Z"
          ? `2${dni.slice(1, 8)}`
          : dni.slice(0, 8);
  const number = Number.parseInt(numericPartRaw, 10);
  if (!Number.isFinite(number)) return false;
  return DNI_LETTERS[number % 23] === dni.slice(-1);
}

const DIRECTORY_SELECT = {
  id: true,
  nombre: true,
  dni: true,
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
    orderBy: { fechaInicio: "desc" as const },
    take: 1,
    select: { horasSemanales: true, fechaInicio: true },
  },
} as const;

type DirectoryRow = {
  id: string;
  nombre: string;
  dni: string | null;
  email: string;
  rol: string;
  activo: boolean;
  fechaBaja: Date | null;
  createdAt: Date;
  nfcUidHash: string | null;
  passwordMustChange: boolean;
  empresaId: string;
  empresa: { nombre: string } | null;
  departamento: { nombre: string } | null;
  contratos: { horasSemanales: number; fechaInicio: Date }[];
};

// Auditoría de seguridad (Fase 2.19, hallazgo #23): el DNI es un dato
// identificativo sensible (LOPDGDD/RGPD) que no hace falta ver completo
// para reconocer a alguien en un listado — el nombre ya cumple esa función.
// Se enmascara todo salvo los 3 últimos caracteres (2 dígitos + letra de
// control), suficiente para distinguir duplicados sin exponer el DNI
// entero a cualquiera con acceso de lectura al directorio.
function maskDni(dni: string | null): string | null {
  if (!dni || dni.length <= 3) return dni;
  const visible = dni.slice(-3);
  return `${"*".repeat(dni.length - 3)}${visible}`;
}

function toDirectoryEntry(row: DirectoryRow, options: { maskDni?: boolean } = {}): DirectoryEntry {
  return {
    id: row.id,
    nombre: row.nombre,
    dni: options.maskDni ? maskDni(row.dni) : row.dni,
    email: row.email,
    rol: row.rol as DirectoryEntry["rol"],
    activo: row.activo,
    fechaBaja: row.fechaBaja,
    createdAt: row.createdAt,
    hasNfc: row.nfcUidHash !== null,
    passwordMustChange: row.passwordMustChange,
    empresaId: row.empresaId,
    empresaNombre: row.empresa?.nombre ?? null,
    departamentoNombre: row.departamento?.nombre ?? null,
    contratoHorasSemanales: row.contratos[0]?.horasSemanales ?? null,
    contratoFechaInicio: row.contratos[0]?.fechaInicio ?? null,
  };
}

export class PrismaUsuarioService implements UsuarioService {
  async getProfile(userId: string): Promise<UsuarioProfile | null> {
    const row = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        empresa: { select: { geolocalizacionFichaje: true } },
      },
    });
    return row ? toProfile(row) : null;
  }

  // Traslado 1:1 desde ajustes-actions.ts (actualizarPerfil): misma
  // comprobación de unicidad de email, sin cambiar comportamiento.
  async updateProfile(
    userId: string,
    input: { nombre: string; email: string },
  ): Promise<UpdateProfileResult> {
    const existente = await prisma.usuario.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existente && existente.id !== userId) {
      return { outcome: "email-taken" };
    }

    const updated = await prisma.usuario.update({
      where: { id: userId },
      data: { nombre: input.nombre, email: input.email },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        empresa: { select: { geolocalizacionFichaje: true } },
      },
    });

    return { outcome: "ok", profile: toProfile(updated) };
  }

  // Traslado 1:1 desde ajustes-actions.ts (actualizarPassword). La
  // validación de longitud mínima/confirmación vive en el llamador (misma
  // separación que ya usa fichaje/solicitud: forma en el borde, negocio
  // aquí) — aquí solo se valida la contraseña actual contra el hash.
  async changePassword(
    userId: string,
    input: { currentPassword: string; newPassword: string },
  ): Promise<ChangePasswordResult> {
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!usuario) {
      return { outcome: "invalid-current-password" };
    }

    const isValid = await comparePassword(input.currentPassword, usuario.password);
    if (!isValid) {
      return { outcome: "invalid-current-password" };
    }

    const hashedPassword = await hashPassword(input.newPassword);
    await prisma.usuario.update({
      where: { id: userId },
      data: { password: hashedPassword, passwordMustChange: false },
    });
    // Auditoría de seguridad (Fase 2.19): cambiar la contraseña debe cerrar
    // cualquier sesión móvil activa en otros dispositivos — si el motivo
    // del cambio es un token robado, sin esto el atacante seguía dentro
    // hasta 30 días pese al cambio de contraseña.
    await authService.revokeAllSessions(userId);

    return { outcome: "ok" };
  }

  // Traslado 1:1 desde modificacion-fichajes/page.tsx (query "empleados").
  async listEmpleados(actorId: string, actorRole: ManagerRole): Promise<EmpleadoOption[]> {
    const empresaId =
      actorRole === "GERENTE"
        ? (await prisma.usuario.findUnique({ where: { id: actorId }, select: { empresaId: true } }))?.empresaId ??
          null
        : null;

    if (actorRole === "GERENTE" && !empresaId) {
      return [];
    }

    const rows = await prisma.usuario.findMany({
      where: {
        rol: "EMPLEADO",
        ...(empresaId ? { empresaId } : {}),
      },
      select: { id: true, nombre: true, email: true },
      orderBy: { nombre: "asc" },
    });

    return rows;
  }

  private async resolveGerenteEmpresaId(actorId: string): Promise<string | null> {
    const gerente = await prisma.usuario.findUnique({ where: { id: actorId }, select: { empresaId: true } });
    return gerente?.empresaId ?? null;
  }

  // Traslado 1:1 desde empleados/page.tsx (query "usuarios" + paginación).
  // A diferencia de la web, no se busca por hash de NFC (no tiene sentido
  // como criterio de búsqueda desde un directorio de móvil).
  async listDirectory(
    actorId: string,
    actorRole: ManagerRole,
    filters: ListDirectoryFilters,
  ): Promise<ListDirectoryResult> {
    const pageSize = 20;
    const page = Math.max(1, filters.page ?? 1);
    const skip = (page - 1) * pageSize;

    const estadoWhere =
      filters.estado === "baja" ? { activo: false } : filters.estado === "todos" ? {} : { activo: true };

    const query = filters.query?.trim();
    const searchFilters = query
      ? {
          OR: [
            { nombre: { contains: query, mode: "insensitive" as const } },
            { dni: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {};

    let whereClause;
    if (actorRole === "ADMIN_SISTEMA") {
      whereClause = {
        rol: filters.rol ?? { in: ["EMPLEADO" as const, "GERENTE" as const] },
        ...(filters.empresaId ? { empresaId: filters.empresaId } : {}),
        ...estadoWhere,
        ...searchFilters,
      };
    } else {
      const empresaId = await this.resolveGerenteEmpresaId(actorId);
      whereClause = empresaId
        ? { rol: "EMPLEADO" as const, empresaId, ...estadoWhere, ...searchFilters }
        : { rol: "EMPLEADO" as const, id: "__none__" };
    }

    const [rows, total] = await Promise.all([
      prisma.usuario.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: DIRECTORY_SELECT,
      }),
      prisma.usuario.count({ where: whereClause }),
    ]);

    return {
      usuarios: rows.map((row) => toDirectoryEntry(row, { maskDni: true })),
      total,
      page,
      pageSize,
    };
  }

  async getEmpleadoDetail(
    actorId: string,
    actorRole: ManagerRole,
    empleadoId: string,
  ): Promise<DirectoryEntry | null> {
    const row = await prisma.usuario.findUnique({ where: { id: empleadoId }, select: DIRECTORY_SELECT });
    if (!row || row.rol === "ADMIN_SISTEMA") return null;

    if (actorRole === "GERENTE") {
      const empresaId = await this.resolveGerenteEmpresaId(actorId);
      if (!empresaId || row.empresaId !== empresaId) return null;
    }

    return toDirectoryEntry(row);
  }

  // Traslado 1:1 desde empleados/page.tsx (query "departamentos").
  async listDepartamentosOptions(actorId: string, actorRole: ManagerRole): Promise<DepartamentoOption[]> {
    const empresaId = actorRole === "GERENTE" ? await this.resolveGerenteEmpresaId(actorId) : null;
    if (actorRole === "GERENTE" && !empresaId) return [];

    const rows = await prisma.departamento.findMany({
      where: empresaId ? { empresaId } : {},
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, empresaId: true, empresa: { select: { nombre: true } } },
    });

    return rows.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      empresaId: r.empresaId,
      empresaNombre: r.empresa?.nombre ?? null,
    }));
  }

  // Traslado 1:1 desde empleados/page.tsx (query "empresas", solo ADMIN_SISTEMA).
  async listEmpresasOptions(): Promise<EmpresaOption[]> {
    return prisma.empresa.findMany({
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    });
  }

  // Traslado 1:1 desde admin-actions.ts (crearUsuario).
  async crearUsuario(input: CreateUsuarioInput): Promise<CreateUsuarioResult> {
    const dni = normalizeDni(input.dni);
    if (!isValidDni(dni)) {
      return { outcome: "invalid-dni" };
    }

    // Solo relevante para la web (formulario con lector físico) — ver
    // CreateUsuarioInput.nfcUid.
    let nfcUidHash: string | null = null;
    const nfcUidRaw = input.nfcUid ? sanitizeNfcUid(input.nfcUid) : null;
    if (nfcUidRaw) {
      if (nfcUidRaw.length < 4 || nfcUidRaw.length > 32) {
        return { outcome: "invalid-nfc" };
      }
      nfcUidHash = hashNfcUid(nfcUidRaw);
      const existenteUid = await prisma.usuario.findFirst({ where: { nfcUidHash }, select: { id: true } });
      if (existenteUid) {
        return { outcome: "nfc-taken" };
      }
    }

    const existente = await prisma.usuario.findUnique({ where: { email: input.email }, select: { id: true } });
    if (existente) {
      return { outcome: "email-taken" };
    }

    const existenteDni = await prisma.usuario.findUnique({ where: { dni }, select: { id: true } });
    if (existenteDni) {
      return { outcome: "dni-taken" };
    }

    const departamentoFinal = input.rol === "EMPLEADO" ? input.departamentoId : null;
    if (departamentoFinal) {
      const departamento = await prisma.departamento.findUnique({
        where: { id: departamentoFinal },
        select: { empresaId: true },
      });
      if (!departamento || departamento.empresaId !== input.empresaId) {
        return { outcome: "invalid-departamento" };
      }
    }

    const hashedPassword = await hashPassword(input.password);

    await prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          nombre: input.nombre,
          dni,
          email: input.email,
          password: hashedPassword,
          passwordMustChange: true,
          rol: input.rol,
          empresaId: input.empresaId,
          departamentoId: departamentoFinal,
          nfcUidHash,
        },
      });

      if (input.rol === "EMPLEADO" && input.horasSemanales) {
        await tx.contrato.create({
          data: { usuarioId: usuario.id, horasSemanales: input.horasSemanales, fechaInicio: new Date() },
        });
      }
    });

    return { outcome: "ok" };
  }

  // Traslado 1:1 desde admin-actions.ts (resetUsuarioPassword).
  async resetPassword(usuarioId: string, newPassword: string): Promise<AdminTargetResult> {
    const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: { id: true, rol: true } });
    if (!usuario) return { outcome: "not-found" };
    if (usuario.rol === "ADMIN_SISTEMA") return { outcome: "forbidden-target" };

    const hashedPassword = await hashPassword(newPassword);
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { password: hashedPassword, passwordMustChange: true },
    });
    // Mismo motivo que changePassword: un reset por admin suele responder a
    // un incidente (dispositivo perdido, sospecha de acceso indebido) — no
    // cerrar las sesiones móviles existentes anularía el propio reset.
    await authService.revokeAllSessions(usuarioId);

    return { outcome: "ok" };
  }

  // Traslado 1:1 desde admin-actions.ts (actualizarEmailUsuario).
  async updateEmailAdmin(usuarioId: string, email: string): Promise<UpdateEmailAdminResult> {
    const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: { id: true, rol: true } });
    if (!usuario) return { outcome: "not-found" };
    if (usuario.rol === "ADMIN_SISTEMA") return { outcome: "forbidden-target" };

    const existente = await prisma.usuario.findUnique({ where: { email }, select: { id: true } });
    if (existente && existente.id !== usuarioId) return { outcome: "email-taken" };

    await prisma.usuario.update({ where: { id: usuarioId }, data: { email } });
    return { outcome: "ok" };
  }

  // Traslado 1:1 desde admin-actions.ts (actualizarDniUsuario).
  async updateDniAdmin(usuarioId: string, dniRaw: string): Promise<UpdateDniAdminResult> {
    const dni = normalizeDni(dniRaw);
    if (!isValidDni(dni)) return { outcome: "invalid-dni" };

    const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: { id: true, rol: true } });
    if (!usuario) return { outcome: "not-found" };
    if (usuario.rol === "ADMIN_SISTEMA") return { outcome: "forbidden-target" };

    const existente = await prisma.usuario.findUnique({ where: { dni }, select: { id: true } });
    if (existente && existente.id !== usuarioId) return { outcome: "dni-taken" };

    await prisma.usuario.update({ where: { id: usuarioId }, data: { dni } });
    return { outcome: "ok" };
  }

  // Traslado 1:1 desde admin-actions.ts (actualizarEstadoUsuario).
  async updateEstado(usuarioId: string, actorId: string, accion: EstadoAccion): Promise<UpdateEstadoResult> {
    if (usuarioId === actorId) return { outcome: "self" };

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { id: true, rol: true, activo: true },
    });
    if (!usuario) return { outcome: "not-found" };
    if (usuario.rol === "ADMIN_SISTEMA") return { outcome: "forbidden-target" };

    if (accion === "baja") {
      if (!usuario.activo) return { outcome: "already-in-state" };
      await prisma.usuario.update({ where: { id: usuarioId }, data: { activo: false, fechaBaja: new Date() } });
      // Un usuario dado de baja no debe conservar acceso desde el móvil.
      await authService.revokeAllSessions(usuarioId);
      return { outcome: "ok" };
    }

    if (usuario.activo) return { outcome: "already-in-state" };
    await prisma.usuario.update({ where: { id: usuarioId }, data: { activo: true, fechaBaja: null } });
    return { outcome: "ok" };
  }

  // Traslado 1:1 desde admin-actions.ts (eliminarUsuario).
  async eliminarUsuario(usuarioId: string, actorId: string): Promise<EliminarUsuarioResult> {
    if (usuarioId === actorId) return { outcome: "self" };

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        rol: true,
        _count: {
          select: {
            fichajes: true,
            solicitudes: true,
            solicitudesFichajeEnviadas: true,
            solicitudesFichajeRecibidas: true,
            solicitudesFichajeRespondidas: true,
            passwordResetTokens: true,
            justificanteAccesos: true,
            gerenteDepartamentos: true,
            gerenteCentros: true,
            contratos: true,
            exportacionesSolicitadas: true,
            mobileSessions: true,
          },
        },
      },
    });
    if (!usuario) return { outcome: "not-found" };
    if (usuario.rol === "ADMIN_SISTEMA") return { outcome: "forbidden-target" };

    const blockers: string[] = [];
    if (usuario._count.fichajes > 0) blockers.push("fichajes");
    if (usuario._count.solicitudes > 0) blockers.push("solicitudes");
    if (usuario._count.solicitudesFichajeEnviadas > 0) blockers.push("solicitudes enviadas");
    if (usuario._count.solicitudesFichajeRecibidas > 0) blockers.push("solicitudes recibidas");
    if (usuario._count.solicitudesFichajeRespondidas > 0) blockers.push("solicitudes respondidas");
    if (usuario._count.justificanteAccesos > 0) blockers.push("justificantes");

    if (blockers.length > 0) {
      return { outcome: "has-blockers", blockers };
    }

    await prisma.$transaction(async (tx) => {
      if (usuario._count.gerenteDepartamentos > 0) {
        await tx.departamento.updateMany({ where: { gerenteId: usuarioId }, data: { gerenteId: null } });
      }
      if (usuario._count.gerenteCentros > 0) {
        await tx.centroTrabajo.updateMany({ where: { gerenteId: usuarioId }, data: { gerenteId: null } });
      }
      if (usuario._count.passwordResetTokens > 0) {
        await tx.passwordResetToken.deleteMany({ where: { usuarioId } });
      }
      if (usuario._count.contratos > 0) {
        await tx.contrato.deleteMany({ where: { usuarioId } });
      }
      if (usuario._count.exportacionesSolicitadas > 0) {
        await tx.exportacion.deleteMany({ where: { solicitadoPorId: usuarioId } });
      }
      // Auditoría de seguridad (Fase 2.19): MobileSession tiene FK
      // ON DELETE RESTRICT hacia Usuario — sin esto, borrar a alguien con
      // una sesión móvil activa (el caso normal, no el raro) lanzaba un
      // error de FK sin capturar y devolvía un 500 en vez de completarse.
      if (usuario._count.mobileSessions > 0) {
        await tx.mobileSessionTokenHistory.deleteMany({ where: { session: { usuarioId } } });
        await tx.mobileSession.deleteMany({ where: { usuarioId } });
      }

      await tx.usuario.delete({ where: { id: usuarioId } });
    });

    return { outcome: "ok" };
  }

  // Traslado 1:1 desde admin-actions.ts (crearContrato).
  async crearContrato(
    actorId: string,
    actorRole: ManagerRole,
    input: CrearContratoInput,
  ): Promise<CrearContratoResult> {
    const empleado = await prisma.usuario.findUnique({
      where: { id: input.empleadoId },
      select: { id: true, rol: true, empresaId: true },
    });
    if (!empleado || empleado.rol !== "EMPLEADO") {
      return { outcome: "invalid-employee" };
    }

    if (actorRole === "GERENTE") {
      const empresaId = await this.resolveGerenteEmpresaId(actorId);
      if (!empresaId || empresaId !== empleado.empresaId) {
        return { outcome: "employee-out-of-scope" };
      }
    }

    try {
      await prisma.$transaction(async (tx) => {
        const contratoActivo = await tx.contrato.findFirst({
          where: { usuarioId: input.empleadoId, fechaFin: null },
          orderBy: { fechaInicio: "desc" },
        });

        if (contratoActivo) {
          if (input.fechaInicio.getTime() <= contratoActivo.fechaInicio.getTime()) {
            const contratoAnterior = await tx.contrato.findFirst({
              where: { usuarioId: input.empleadoId, fechaFin: { not: null } },
              orderBy: { fechaFin: "desc" },
            });

            if (
              contratoAnterior?.fechaFin &&
              input.fechaInicio.getTime() <= contratoAnterior.fechaFin.getTime()
            ) {
              throw new Error("La fecha de inicio debe ser posterior al fin del contrato anterior.");
            }

            await tx.contrato.update({
              where: { id: contratoActivo.id },
              data: { fechaInicio: input.fechaInicio, horasSemanales: input.horasSemanales },
            });
            return;
          }

          const fechaFin = new Date(input.fechaInicio.getTime() - 1);
          await tx.contrato.update({ where: { id: contratoActivo.id }, data: { fechaFin } });
        }

        await tx.contrato.create({
          data: { usuarioId: input.empleadoId, horasSemanales: input.horasSemanales, fechaInicio: input.fechaInicio },
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("La fecha de inicio debe ser posterior")) {
        return { outcome: "invalid-start-date", message: error.message };
      }
      throw error;
    }

    return { outcome: "ok" };
  }

  // Traslado 1:1 desde admin-actions.ts (cambiarEmpresaUsuario, Fase 2.16
  // — pendiente desde la 2.13).
  async cambiarEmpresaUsuario(usuarioId: string, empresaId: string): Promise<CambiarEmpresaUsuarioResult> {
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { id: true, rol: true, departamentoId: true, empresaId: true },
    });

    if (!usuario) {
      return { outcome: "not-found" };
    }

    if (usuario.rol === "ADMIN_SISTEMA") {
      return { outcome: "forbidden-target" };
    }

    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { id: true },
    });

    if (!empresa) {
      return { outcome: "invalid-empresa" };
    }

    let departamentoId: string | null = usuario.departamentoId ?? null;
    if (departamentoId) {
      const departamento = await prisma.departamento.findUnique({
        where: { id: departamentoId },
        select: { empresaId: true },
      });
      if (!departamento || departamento.empresaId !== empresaId) {
        departamentoId = null;
      }
    }

    if (usuario.rol === "GERENTE") {
      await prisma.departamento.updateMany({
        where: { gerenteId: usuarioId, empresaId: { not: empresaId } },
        data: { gerenteId: null },
      });
      await prisma.centroTrabajo.updateMany({
        where: { gerenteId: usuarioId, empresaId: { not: empresaId } },
        data: { gerenteId: null },
      });
    }

    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { empresaId, departamentoId },
    });

    return { outcome: "ok" };
  }
}
