export interface AuthContext {
  userId: string;
  role: "ADMIN_SISTEMA" | "GERENTE" | "EMPLEADO";
  empresaId: string | null;
  passwordMustChange: boolean;
}

export type VerifyCredentialsResult =
  | {
      outcome: "ok";
      user: AuthContext & {
        nombre: string;
        email: string;
      };
    }
  | {
      outcome: "invalid-credentials";
    }
  | {
      outcome: "blocked";
    };

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
}

export interface DeviceInfo {
  deviceName?: string;
  platform?: string;
}

// Auditoría de seguridad (Fase 2.19, hallazgo #3): nunca incluye
// refreshTokenHash ni ningún dato del token — solo lo necesario para que el
// usuario reconozca "cuál es cuál" en su lista de dispositivos.
export interface MobileSessionSummary {
  id: string;
  deviceName: string | null;
  platform: string | null;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date;
}

/**
 * Contrato público de dominio. No depende de Next.js, HTTP, cookies ni del
 * proveedor NFC: el llamador (NextAuth adapter o Route Handler) resuelve el
 * transporte antes de invocar.
 *
 * La persistencia (MobileSession) solo afecta al ciclo de vida del refresh
 * token. El access token sigue siendo JWT stateless: verifyAccessToken()
 * nunca consulta la base de datos.
 */
export interface AuthService {
  verifyCredentials(
    email: string,
    password: string,
  ): Promise<VerifyCredentialsResult>;

  issueTokenPair(context: AuthContext, device?: DeviceInfo): Promise<TokenPair>;

  verifyAccessToken(token: string): Promise<AuthContext>;

  /**
   * Rota el refresh token en cada uso (un token solo sirve una vez). Puede
   * lanzar por token inválido, sesión revocada/expirada, o reutilización de
   * un token ya rotado fuera de la ventana de gracia — nunca se distingue
   * el motivo hacia el llamador.
   */
  refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresIn: number;
  }>;

  /** Revoca una única sesión (logout de este dispositivo). Idempotente: no
   * lanza si el token no existe o ya estaba revocado. */
  revokeSession(refreshToken: string): Promise<void>;

  /** Revoca todas las sesiones activas de un usuario (logout remoto /
   * desactivación). Idempotente. Devuelve cuántas sesiones se revocaron. */
  revokeAllSessions(userId: string): Promise<number>;

  /** Lista las sesiones móviles activas (no revocadas, no expiradas) de un
   * usuario — para que pueda ver "dónde tiene sesión iniciada" y revocar
   * dispositivos concretos. */
  listSessions(userId: string): Promise<MobileSessionSummary[]>;

  /** Revoca UNA sesión concreta, verificando que pertenezca a userId antes
   * de tocarla — así un usuario nunca puede revocar la sesión de otro
   * pasando un id ajeno. Devuelve false si no existía o no era suya. */
  revokeSessionForUser(userId: string, sessionId: string): Promise<boolean>;
}
