export type ManagerRole = "GERENTE" | "ADMIN_SISTEMA";

export type TipoFichaje = "JORNADA" | "PAUSA_COMIDA" | "DESCANSO" | "MEDICO";
export type EstadoFiltro = "abierto" | "cerrado" | "todos";

export interface FichajeEmpresaEntry {
  id: string;
  empleadoNombre: string;
  empleadoEmail: string;
  empresaNombre: string | null;
  entrada: Date;
  salida: Date | null;
  tipo: TipoFichaje;
  editado: boolean;
  // Fase 2.20: coordenadas guardadas al fichar (solo si la empresa tiene
  // "Guardar ubicación al fichar" activado — ver fichaje/service.ts). El
  // gerente las usa para abrir la dirección en Google Maps, nunca se
  // resuelve a texto en el servidor.
  latitud: number | null;
  longitud: number | null;
  latitudSalida: number | null;
  longitudSalida: number | null;
}

export interface ListFichajesEmpresaFilters {
  // Solo lo usa ADMIN_SISTEMA para elegir empresa (o dejarlo vacío = todas).
  // Para GERENTE se ignora y se acota siempre a la suya.
  empresaId?: string;
  empleadoId?: string;
  estado?: EstadoFiltro;
  tipo?: TipoFiltro;
  desde?: Date;
  hasta?: Date;
}

export type TipoFiltro = TipoFichaje | "todos";

export interface ListFichajesEmpresaResult {
  fichajes: FichajeEmpresaEntry[];
  total: number;
  // false solo para GERENTE sin empresa asociada (caso borde, igual que la
  // web con "No tienes una empresa asignada para consultar fichajes.").
  canQuery: boolean;
}

export interface EmpleadoPorEmpresaOption {
  id: string;
  nombre: string;
  email: string;
}

/**
 * Consola de fichajes de empresa (Fase 2.15): listado filtrable de solo
 * lectura, sin acciones de escritura (el badge "Validado/Pendiente" de la
 * web es puramente derivado de si hay salida registrada, no una acción).
 * GERENTE acotado a su empresa, ADMIN_SISTEMA sin acotar salvo que elija
 * una empresa concreta.
 */
export interface FichajesEmpresaService {
  listFichajes(
    actorId: string,
    actorRole: ManagerRole,
    filters: ListFichajesEmpresaFilters,
  ): Promise<ListFichajesEmpresaResult>;

  // Selector de empleados para el filtro, acotado a una empresa concreta
  // (igual que la web: vacío hasta que hay empresa elegida).
  listEmpleadosPorEmpresa(
    actorId: string,
    actorRole: ManagerRole,
    empresaId: string,
  ): Promise<EmpleadoPorEmpresaOption[]>;
}
