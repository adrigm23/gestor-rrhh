export interface SolicitudModificacionFichajeEntry {
  id: string;
  solicitanteNombre: string;
  solicitanteEmail: string;
  fichajeEntrada: Date | null;
  fichajeSalida: Date | null;
  entradaPropuesta: Date | null;
  salidaPropuesta: Date | null;
  motivo: string | null;
  createdAt: Date;
}

export type RespondAccion = "ACEPTADA" | "RECHAZADA";

export type RespondModificacionResult =
  | { outcome: "ok" }
  | { outcome: "not-found" }
  | { outcome: "already-responded" }
  | { outcome: "no-hours-proposed" }
  | { outcome: "entrada-required-for-update" }
  | { outcome: "entrada-required-for-create" }
  | { outcome: "invalid-range" }
  | { outcome: "overlap" };

export type ManagerRole = "GERENTE" | "ADMIN_SISTEMA";

export interface FichajeOption {
  id: string;
  entrada: Date;
  salida: Date | null;
}

export interface CreateModificacionInput {
  empleadoId: string;
  fichajeId: string | null;
  entradaPropuesta: Date | null;
  salidaPropuesta: Date | null;
  motivo: string | null;
}

export type CreateModificacionResult =
  | { outcome: "ok" }
  | { outcome: "invalid-employee" }
  | { outcome: "employee-out-of-scope" }
  | { outcome: "invalid-fichaje" };

export interface SolicitudModificacionManagerEntry {
  id: string;
  empleadoNombre: string;
  empleadoEmail: string;
  estado: "PENDIENTE" | "ACEPTADA" | "RECHAZADA";
  entradaPropuesta: Date | null;
  salidaPropuesta: Date | null;
  motivo: string | null;
  createdAt: Date;
}

/**
 * Contrato público de dominio para solicitudes de modificación de fichaje,
 * tanto la respuesta del EMPLEADO (Fase 2.7) como la creación por parte de
 * GERENTE/ADMIN_SISTEMA (Fase 2.11). No depende de Next.js, HTTP ni sesión:
 * el llamador resuelve `empleadoId`/`actorId` antes de invocar.
 */
export interface ModificacionFichajeService {
  listPending(empleadoId: string, limit?: number): Promise<SolicitudModificacionFichajeEntry[]>;
  respond(
    empleadoId: string,
    solicitudId: string,
    accion: RespondAccion,
  ): Promise<RespondModificacionResult>;

  // Selector mínimo de fichajes recientes de un empleado concreto, para
  // adjuntar la propuesta a uno existente (o dejarlo en blanco para crear
  // uno nuevo). `null` = el empleado está fuera del alcance del actor.
  listFichajesForEmpleado(
    actorId: string,
    actorRole: ManagerRole,
    empleadoId: string,
    limit?: number,
  ): Promise<FichajeOption[] | null>;
  create(actorId: string, actorRole: ManagerRole, input: CreateModificacionInput): Promise<CreateModificacionResult>;
  listRecentForManager(
    actorId: string,
    actorRole: ManagerRole,
    limit?: number,
  ): Promise<SolicitudModificacionManagerEntry[]>;
}
