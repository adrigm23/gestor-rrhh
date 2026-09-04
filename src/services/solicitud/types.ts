export type TipoSolicitud = "VACACIONES" | "AUSENCIA";
export type EstadoSolicitud = "PENDIENTE" | "APROBADA" | "RECHAZADA" | "ANULADA";
export type TipoAusencia = "FALTA" | "AVISO";

export interface SolicitudEntry {
  id: string;
  tipo: TipoSolicitud;
  estado: EstadoSolicitud;
  inicio: Date;
  fin: Date | null;
  motivo: string | null;
  ausenciaTipo: TipoAusencia | null;
  createdAt: Date;
  justificanteNombre: string | null;
  justificanteRuta: string | null;
}

export type CreateSolicitudInput =
  | { tipo: "VACACIONES"; inicio: Date; fin: Date; motivo: string | null }
  | {
      tipo: "AUSENCIA";
      inicio: Date;
      fin: Date;
      motivo: string | null;
      ausenciaTipo: TipoAusencia;
    };

export type CreateSolicitudResult =
  | { outcome: "ok"; solicitud: SolicitudEntry }
  | { outcome: "overlap" }
  | { outcome: "invalid-date-range"; message: string };

export interface SolicitudWithUsuario extends SolicitudEntry {
  usuarioNombre: string;
  usuarioEmail: string;
}

export type ManagerRole = "GERENTE" | "ADMIN_SISTEMA";
export type EstadoTransicion = "APROBADA" | "RECHAZADA" | "ANULADA";

export type UpdateSolicitudEstadoResult =
  | { outcome: "ok" }
  | { outcome: "not-found" }
  | { outcome: "unauthorized" }
  | { outcome: "cannot-cancel-pending" }
  | { outcome: "invalid-transition" }
  | { outcome: "overlap" };

/**
 * Contrato público de dominio. No depende de Next.js, HTTP ni sesión:
 * el llamador (Server Action o Route Handler) resuelve `userId` antes de invocar.
 */
export interface SolicitudService {
  listRecent(usuarioId: string, limit?: number): Promise<SolicitudEntry[]>;
  create(usuarioId: string, input: CreateSolicitudInput): Promise<CreateSolicitudResult>;

  // Vista de gestor/admin (GERENTE ve solo su empresa; ADMIN_SISTEMA, todas).
  listPendingForManager(
    actorId: string,
    actorRole: ManagerRole,
    limit?: number,
  ): Promise<SolicitudWithUsuario[]>;
  listHistoryForManager(
    actorId: string,
    actorRole: ManagerRole,
    limit?: number,
  ): Promise<SolicitudWithUsuario[]>;
  updateEstado(
    actorId: string,
    actorRole: ManagerRole,
    solicitudId: string,
    estado: EstadoTransicion,
  ): Promise<UpdateSolicitudEstadoResult>;
}
