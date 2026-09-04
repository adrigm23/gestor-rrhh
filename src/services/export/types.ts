export type Rol = "EMPLEADO" | "GERENTE" | "ADMIN_SISTEMA";

export type TipoExportacion = "FICHAJES" | "FICHAJES_EMPRESAS";
export type EstadoExportacionJob = "PENDIENTE" | "GENERANDO" | "LISTO" | "ERROR";

export interface ExportFiltros {
  from?: string;
  to?: string;
  estado?: string;
  tipo?: string;
  empresaId?: string;
  empleadoId?: string;
}

export interface CrearExportacionInput {
  tipo: TipoExportacion;
  filtros: ExportFiltros;
  // Solo relevante para ADMIN_SISTEMA (elige empresa en el formulario); a
  // GERENTE se le fuerza siempre la suya, igual que en el resto de
  // servicios de gestión.
  empresaIdForm?: string | null;
}

export type CrearExportacionResult =
  | { outcome: "ok"; jobId: string }
  | { outcome: "invalid-tipo" }
  | { outcome: "empresa-requerida" }
  | { outcome: "invalid-empresa" }
  | { outcome: "invalid-empleado" }
  | { outcome: "empleado-fuera-de-empresa" };

export interface ExportacionStatus {
  status: EstadoExportacionJob;
  url?: string | null;
  error?: string | null;
}

/**
 * Exportación asíncrona de fichajes a CSV (Fase 2.15): traslado 1:1 desde
 * export-actions.ts. El job se crea en BD y se procesa en la misma
 * petición que lo consulta (no hay cola real de fondo); el resultado se
 * sube a Supabase Storage y se sirve mediante una URL firmada de vida
 * corta. Igual que el resto de servicios: el llamador resuelve
 * actorId/actorRole antes de invocar.
 */
export interface ExportService {
  crearExportacion(
    actorId: string,
    actorRole: Rol,
    input: CrearExportacionInput,
  ): Promise<CrearExportacionResult>;

  // No se acota por rol aquí (igual que la web): cualquier usuario
  // autenticado puede consultar SU PROPIO job, comprobado por
  // solicitadoPorId dentro del servicio.
  obtenerExportacion(actorId: string, jobId: string): Promise<ExportacionStatus>;
}
