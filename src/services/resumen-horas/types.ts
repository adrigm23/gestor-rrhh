export interface FichajeTramoEntry {
  id: string;
  entrada: Date;
  salida: Date | null;
  tipo: "JORNADA" | "PAUSA_COMIDA" | "DESCANSO" | "MEDICO";
  durationMs: number;
}

export interface ResumenHoras {
  empleadoNombre: string;
  empleadoEmail: string;
  empresaNombre: string | null;
  pausaCuentaComoTrabajo: boolean;
  rangeStart: Date;
  rangeEnd: Date;
  totalMs: number;
  contratoHorasSemanales: number | null;
  contratoDesde: Date | null;
  progresoPercent: number | null;
  fichajes: FichajeTramoEntry[];
}

export type GetResumenResult =
  | { outcome: "ok"; data: ResumenHoras }
  | { outcome: "no-empresa" }
  | { outcome: "empleado-not-found" };

/**
 * Contrato público de dominio para el resumen de horas trabajadas frente al
 * contrato semanal (Fase 2.12), trasladado desde escritorio/page.tsx. A
 * diferencia de la web, aquí el rango es siempre "semana actual" — sin
 * selector de fechas personalizado. Igual que en la web, ADMIN_SISTEMA no
 * tiene ningún camino válido por este service (queda excluido en el
 * router/pantalla, no aquí). No depende de Next.js, HTTP ni sesión: el
 * llamador resuelve `actorId` antes de invocar.
 */
export interface ResumenHorasService {
  // `empleadoId` solo aplica a GERENTE (para ver a un empleado de su
  // equipo); un EMPLEADO siempre ve lo suyo, ignorando este parámetro.
  getResumen(actorId: string, actorRole: "EMPLEADO" | "GERENTE", empleadoId?: string): Promise<GetResumenResult>;
}
