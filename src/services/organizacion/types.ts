export type ManagerRole = "GERENTE" | "ADMIN_SISTEMA";

export interface CentroTrabajoEntry {
  id: string;
  nombre: string;
  direccion: string | null;
  gerenteNombre: string | null;
  empresaNombre: string | null;
  departamentosCount: number;
}

export interface DepartamentoEntry {
  id: string;
  nombre: string;
  gerenteNombre: string | null;
  centroTrabajoNombre: string | null;
  empresaNombre: string | null;
  empleadosCount: number;
}

export interface GerenteOption {
  id: string;
  nombre: string;
  email: string;
  empresaNombre: string | null;
}

export interface CrearCentroTrabajoInput {
  nombre: string;
  gerenteId: string | null;
  direccion: string | null;
  // Solo se usa cuando el actor es ADMIN_SISTEMA (elige empresa); para
  // GERENTE se ignora y se usa siempre la suya propia.
  empresaId: string | null;
}

export type CrearCentroTrabajoResult =
  | { outcome: "ok" }
  | { outcome: "empresa-requerida" }
  | { outcome: "gerente-invalido" }
  | { outcome: "nombre-duplicado" };

export interface CrearDepartamentoInput {
  nombre: string;
  gerenteId: string | null;
  centroTrabajoId: string | null;
  empresaId: string | null;
}

export type CrearDepartamentoResult =
  | { outcome: "ok" }
  | { outcome: "empresa-requerida" }
  | { outcome: "gerente-invalido" }
  | { outcome: "centro-invalido" }
  | { outcome: "nombre-duplicado" };

export type UpdateCentroDireccionResult =
  | { outcome: "ok" }
  | { outcome: "not-found" }
  | { outcome: "out-of-scope" };

/**
 * Contrato de dominio para departamentos y centros de trabajo (Fase 2.14).
 * GERENTE y ADMIN_SISTEMA (nunca EMPLEADO); GERENTE queda acotado a su
 * propia empresa, ADMIN_SISTEMA opera sobre cualquiera. Igual que el resto
 * de servicios: no depende de Next.js/HTTP/sesión, el llamador resuelve
 * actorId/actorRole. El chequeo "¿puede llamar a esto en absoluto?" (rol
 * EMPLEADO excluido) vive en el router/action, igual que siempre.
 */
export interface OrganizacionService {
  listCentros(actorId: string, actorRole: ManagerRole): Promise<CentroTrabajoEntry[]>;
  listDepartamentos(actorId: string, actorRole: ManagerRole): Promise<DepartamentoEntry[]>;
  listGerentesOptions(actorId: string, actorRole: ManagerRole): Promise<GerenteOption[]>;

  crearCentroTrabajo(
    actorId: string,
    actorRole: ManagerRole,
    input: CrearCentroTrabajoInput,
  ): Promise<CrearCentroTrabajoResult>;

  crearDepartamento(
    actorId: string,
    actorRole: ManagerRole,
    input: CrearDepartamentoInput,
  ): Promise<CrearDepartamentoResult>;

  updateCentroDireccion(
    actorId: string,
    actorRole: ManagerRole,
    centroId: string,
    direccion: string | null,
  ): Promise<UpdateCentroDireccionResult>;
}
