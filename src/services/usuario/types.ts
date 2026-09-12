export type Rol = "EMPLEADO" | "GERENTE" | "ADMIN_SISTEMA";

export interface UsuarioProfile {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  // Fase 2.20 (geolocalización en fichaje): el móvil necesita saber si su
  // empresa quiere que se guarde la ubicación al fichar, igual que ya
  // consulta la web (userMeta.empresa.geolocalizacionFichaje) — antes
  // ningún endpoint accesible por EMPLEADO exponía esto.
  geolocalizacionFichaje: boolean;
}

export type UpdateProfileResult =
  | { outcome: "ok"; profile: UsuarioProfile }
  | { outcome: "email-taken" };

export type ChangePasswordResult =
  | { outcome: "ok" }
  | { outcome: "invalid-current-password" };

export type ManagerRole = "GERENTE" | "ADMIN_SISTEMA";

export interface EmpleadoOption {
  id: string;
  nombre: string;
  email: string;
}

// --- Directorio y administración (Fase 2.13) ---

export interface DirectoryEntry {
  id: string;
  nombre: string;
  dni: string | null;
  email: string;
  rol: "EMPLEADO" | "GERENTE";
  activo: boolean;
  fechaBaja: Date | null;
  createdAt: Date;
  hasNfc: boolean;
  passwordMustChange: boolean;
  empresaId: string;
  empresaNombre: string | null;
  departamentoNombre: string | null;
  contratoHorasSemanales: number | null;
  contratoFechaInicio: Date | null;
}

export interface ListDirectoryFilters {
  query?: string;
  // Solo ADMIN_SISTEMA puede filtrar por empresa — GERENTE ya está
  // acotado a la suya.
  empresaId?: string;
  rol?: "EMPLEADO" | "GERENTE";
  estado?: "activos" | "baja" | "todos";
  page?: number;
}

export interface ListDirectoryResult {
  usuarios: DirectoryEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DepartamentoOption {
  id: string;
  nombre: string;
  empresaId: string;
  empresaNombre: string | null;
}

export interface EmpresaOption {
  id: string;
  nombre: string;
}

export interface CreateUsuarioInput {
  nombre: string;
  dni: string;
  email: string;
  password: string;
  rol: "EMPLEADO" | "GERENTE";
  empresaId: string;
  departamentoId: string | null;
  horasSemanales: number | null;
  // Solo lo usa la web (formulario con lector físico) — el móvil nunca lo
  // envía, ver Fase 2.6/2.13 (sin lector NFC-HID compatible).
  nfcUid?: string | null;
}

export type CreateUsuarioResult =
  | { outcome: "ok" }
  | { outcome: "invalid-dni" }
  | { outcome: "email-taken" }
  | { outcome: "dni-taken" }
  | { outcome: "invalid-departamento" }
  | { outcome: "invalid-nfc" }
  | { outcome: "nfc-taken" };

export type AdminTargetResult =
  | { outcome: "ok" }
  | { outcome: "not-found" }
  | { outcome: "forbidden-target" };

export type UpdateEmailAdminResult = AdminTargetResult | { outcome: "email-taken" };
export type UpdateDniAdminResult = AdminTargetResult | { outcome: "invalid-dni" } | { outcome: "dni-taken" };

export type EstadoAccion = "baja" | "reactivar";
export type UpdateEstadoResult = AdminTargetResult | { outcome: "self" } | { outcome: "already-in-state" };

export type EliminarUsuarioResult =
  | { outcome: "ok" }
  | { outcome: "not-found" }
  | { outcome: "forbidden-target" }
  | { outcome: "self" }
  | { outcome: "has-blockers"; blockers: string[] };

export interface CrearContratoInput {
  empleadoId: string;
  horasSemanales: number;
  fechaInicio: Date;
}

export type CrearContratoResult =
  | { outcome: "ok" }
  | { outcome: "invalid-employee" }
  | { outcome: "employee-out-of-scope" }
  | { outcome: "invalid-start-date"; message: string };

export type CambiarEmpresaUsuarioResult = AdminTargetResult | { outcome: "invalid-empresa" };

/**
 * Contrato público de dominio para operaciones sobre el propio usuario
 * autenticado ("self-service") y, desde la Fase 2.13, para el directorio
 * y la administración de otros usuarios (GERENTE/ADMIN_SISTEMA). No
 * depende de Next.js, HTTP ni sesión: el llamador resuelve
 * `userId`/`actorId` antes de invocar. Los chequeos de rol puramente de
 * "¿puede llamar a esto en absoluto?" (p. ej. solo ADMIN_SISTEMA) viven en
 * el router/action, igual que en el resto de servicios de este proyecto;
 * aquí solo vive la lógica que sí depende de datos (acotar por empresa,
 * validar el objetivo, etc).
 */
export interface UsuarioService {
  getProfile(userId: string): Promise<UsuarioProfile | null>;
  updateProfile(userId: string, input: { nombre: string; email: string }): Promise<UpdateProfileResult>;
  changePassword(
    userId: string,
    input: { currentPassword: string; newPassword: string },
  ): Promise<ChangePasswordResult>;

  // Selector mínimo (id/nombre/email) para formularios de gestor/admin que
  // necesitan elegir un empleado (p. ej. proponer una corrección de
  // fichaje, Fase 2.11). No es el directorio completo — eso es la Fase
  // 2.13, que construye encima de un listado más rico.
  listEmpleados(actorId: string, actorRole: ManagerRole): Promise<EmpleadoOption[]>;

  listDirectory(actorId: string, actorRole: ManagerRole, filters: ListDirectoryFilters): Promise<ListDirectoryResult>;
  getEmpleadoDetail(actorId: string, actorRole: ManagerRole, empleadoId: string): Promise<DirectoryEntry | null>;

  // Selectores mínimos para el formulario de creación (ADMIN_SISTEMA).
  listDepartamentosOptions(actorId: string, actorRole: ManagerRole): Promise<DepartamentoOption[]>;
  listEmpresasOptions(): Promise<EmpresaOption[]>;

  crearUsuario(input: CreateUsuarioInput): Promise<CreateUsuarioResult>;
  resetPassword(usuarioId: string, newPassword: string): Promise<AdminTargetResult>;
  updateEmailAdmin(usuarioId: string, email: string): Promise<UpdateEmailAdminResult>;
  updateDniAdmin(usuarioId: string, dni: string): Promise<UpdateDniAdminResult>;
  updateEstado(usuarioId: string, actorId: string, accion: EstadoAccion): Promise<UpdateEstadoResult>;
  eliminarUsuario(usuarioId: string, actorId: string): Promise<EliminarUsuarioResult>;

  crearContrato(actorId: string, actorRole: ManagerRole, input: CrearContratoInput): Promise<CrearContratoResult>;

  // Fase 2.16: mover un usuario de empresa (pendiente desde la 2.13).
  cambiarEmpresaUsuario(usuarioId: string, empresaId: string): Promise<CambiarEmpresaUsuarioResult>;
}
