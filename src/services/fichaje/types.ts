import type { ApprovedLeaveType } from "../../app/lib/vacaciones";

export interface FichajeEntry {
  id: string;
  tipo: "JORNADA" | "PAUSA_COMIDA";
  entrada: Date;
  salida: Date | null;
}

export interface FichajeCoordinates {
  latitude: number;
  longitude: number;
}

export interface FichajeStatus {
  shift: FichajeEntry | null;
  pause: FichajeEntry | null;
  blockedByLeave: ApprovedLeaveType | null;
  // Suma de las pausas YA CERRADAS durante el turno activo (no incluye la
  // pausa abierta actual, esa se descuenta aparte en tiempo real). Antes
  // solo la web lo calculaba (dashboard/calendario/page.tsx); expuesto
  // aquí desde la Fase 2.17 para que el contador de tiempo trabajado del
  // móvil deje de ser una aproximación (ver use-elapsed-time.ts).
  pauseAccumulatedMs: number;
}

export interface FichajeHistoryEntry {
  id: string;
  tipo: "JORNADA" | "PAUSA_COMIDA" | "DESCANSO" | "MEDICO";
  entrada: Date;
  salida: Date | null;
  editado: boolean;
}

export type ToggleFichajeResult =
  | { outcome: "blocked-by-leave"; leaveType: ApprovedLeaveType }
  | { outcome: "started"; shift: FichajeEntry }
  | { outcome: "stopped"; shift: FichajeEntry; closedPause: FichajeEntry | null };

export type TogglePausaResult =
  | { outcome: "blocked-by-leave"; leaveType: ApprovedLeaveType }
  | { outcome: "no-active-shift" }
  | { outcome: "started"; pause: FichajeEntry }
  | { outcome: "stopped"; pause: FichajeEntry };

/**
 * Contrato público de dominio. No depende de Next.js, HTTP ni sesión:
 * el llamador (Server Action o Route Handler) resuelve `userId` antes de invocar.
 */
export interface FichajeService {
  getStatus(userId: string, at?: Date): Promise<FichajeStatus>;
  toggleFichaje(userId: string, coords?: FichajeCoordinates): Promise<ToggleFichajeResult>;
  togglePausa(userId: string): Promise<TogglePausaResult>;
  listHistory(userId: string, limit?: number): Promise<FichajeHistoryEntry[]>;
}
