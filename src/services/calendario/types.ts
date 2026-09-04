export interface SolicitudCalendario {
  id: string;
  tipo: "VACACIONES" | "AUSENCIA";
  estado: "PENDIENTE" | "APROBADA" | "RECHAZADA" | "ANULADA";
  inicio: Date;
  fin: Date | null;
  createdAt: Date;
  motivo: string | null;
  ausenciaTipo: "FALTA" | "AVISO" | null;
}

export interface FichajeCalendarioEntry {
  entrada: Date;
  salida: Date | null;
}

export interface CalendarioResult {
  solicitudes: SolicitudCalendario[];
  fichajes: FichajeCalendarioEntry[];
}

/**
 * Calendario personal (Fase 2.17): solicitudes y fichajes de un rango de
 * fechas navegable, para pintar el calendario visual. Traslado 1:1 desde
 * dashboard/calendario/page.tsx. El historial detallado y el estado de
 * turno/pausa en curso siguen viniendo de fichajeService (listHistory /
 * getStatus) — no se duplican aquí.
 */
export interface CalendarioService {
  getRango(userId: string, desde: Date, hasta: Date): Promise<CalendarioResult>;
}
