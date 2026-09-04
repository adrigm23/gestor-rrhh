export interface EmpresaEntry {
  id: string;
  nombre: string;
  cif: string;
  pausaCuentaComoTrabajo: boolean;
  geolocalizacionFichaje: boolean;
  createdAt: Date;
  usuariosCount: number;
  departamentosCount: number;
  centrosTrabajoCount: number;
}

export interface CrearEmpresaInput {
  nombre: string;
  cif: string;
}

export type CrearEmpresaResult =
  | { outcome: "ok" }
  | { outcome: "cif-duplicado" }
  | { outcome: "nombre-duplicado" };

export type EliminarEmpresaResult =
  | { outcome: "ok" }
  | { outcome: "not-found" }
  | { outcome: "has-admins" }
  | { outcome: "has-blockers" };

export interface ActualizarConfigInput {
  pausaCuentaComoTrabajo: boolean;
  geolocalizacionFichaje: boolean;
}

export type ActualizarConfigResult = { outcome: "ok" } | { outcome: "not-found" } | { outcome: "forbidden" };

export type ManagerRole = "GERENTE" | "ADMIN_SISTEMA";

export interface EmpresaConfigSummary {
  id: string;
  nombre: string;
  pausaCuentaComoTrabajo: boolean;
  geolocalizacionFichaje: boolean;
}

/**
 * Gestión multiempresa (Fase 2.16) + configuración por empresa accesible
 * también a GERENTE sobre la suya (Fase 2.17 — corrige una regresión: la
 * 2.16 restringió actualizarConfig a solo ADMIN_SISTEMA sin darse cuenta
 * de que dashboard/ajustes también expone estos mismos toggles a GERENTE
 * a través de EmpresaConfigForm). listEmpresas/crearEmpresa/eliminarEmpresa
 * siguen siendo exclusivas de ADMIN_SISTEMA (esas sí son ADMIN-only en
 * toda la web, dashboard/empresas redirige a cualquier otro rol).
 */
export interface EmpresaService {
  listEmpresas(): Promise<EmpresaEntry[]>;
  crearEmpresa(input: CrearEmpresaInput): Promise<CrearEmpresaResult>;
  eliminarEmpresa(empresaId: string): Promise<EliminarEmpresaResult>;

  // GERENTE solo puede actuar sobre su propia empresa (resuelta a partir
  // de actorId); ADMIN_SISTEMA sobre cualquiera.
  actualizarConfig(
    actorId: string,
    actorRole: ManagerRole,
    empresaId: string,
    input: ActualizarConfigInput,
  ): Promise<ActualizarConfigResult>;

  // Para que GERENTE (o ADMIN_SISTEMA) pueda ver el estado actual de los
  // toggles de su propia empresa antes de cambiarlos, sin necesitar el
  // listado completo (ese sigue siendo ADMIN-only).
  getMiEmpresaConfig(actorId: string, actorRole: ManagerRole): Promise<EmpresaConfigSummary | null>;
}
