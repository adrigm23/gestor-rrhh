import { randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "../../app/lib/prisma";
import { comparePassword } from "../../app/utils/password";
import { sanitizeEmail, sanitizeString } from "../../app/utils/input";
import { rateLimitService } from "../rate-limit";
import { logAuthEvent } from "./auth-events";
import { RateLimitExceededError } from "./errors";
import { isLoginBlocked, recordLoginAttempt } from "./login-throttle";
import { maybeCleanupSessionHistory } from "./session-history-cleanup";
import { hashRefreshToken } from "./token-hash";
import type {
  AuthContext,
  AuthService,
  DeviceInfo,
  MobileSessionSummary,
  TokenPair,
  VerifyCredentialsResult,
} from "./types";

const ACCESS_TOKEN_TTL = "15m";
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL = "30d";
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
// Auditoría de seguridad (Fase 2.19): 10s de gracia es más margen del que
// necesita un reintento HTTP real (normalmente <2s), y cada segundo extra es
// una ventana en la que un token interceptado y reutilizado sigue
// devolviendo el token vigente en vez de disparar la detección de reuso.
const REFRESH_TOKEN_GRACE_SECONDS = 3;
const MAX_SESSION_LIFETIME_DAYS = 90;
const MAX_SESSION_LIFETIME_MS = MAX_SESSION_LIFETIME_DAYS * 24 * 60 * 60 * 1000;
const REFRESH_RATE_LIMIT_MAX = 10;
const REFRESH_RATE_LIMIT_WINDOW_SECONDS = 60;

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const getMobileAuthSecretKey = () => {
  const secret = process.env.MOBILE_AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "MOBILE_AUTH_SECRET no está configurado. Es obligatorio para emitir o verificar tokens móviles.",
    );
  }
  return new TextEncoder().encode(secret);
};

const isRol = (value: unknown): value is AuthContext["role"] =>
  value === "ADMIN_SISTEMA" || value === "GERENTE" || value === "EMPLEADO";

// Único punto de firma de refresh tokens (login y rotación). Cada llamada
// exige un jti explícito: dos tokens con los mismos claims + iat pero jti
// distinto ya no colisionan, evitando la colisión determinista de HS256
// ante logins/rotaciones concurrentes del mismo usuario en el mismo segundo.
const signRefreshToken = (
  secret: Uint8Array,
  userId: string,
  jti: string,
  issuedAt: Date,
  expiresAt: Date,
) =>
  new SignJWT({ type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setJti(jti)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .sign(secret);

const signAccessTokenForUser = (
  secret: Uint8Array,
  user: {
    id: string;
    rol: unknown;
    empresaId: string | null;
    passwordMustChange: boolean | null;
  },
) => {
  if (!isRol(user.rol)) {
    throw new Error("Rol de usuario desconocido");
  }
  return new SignJWT({
    role: user.rol,
    empresaId: user.empresaId ?? null,
    passwordMustChange: user.passwordMustChange ?? false,
    type: "access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(secret);
};

export class JwtAuthService implements AuthService {
  async verifyCredentials(
    email: string,
    password: string,
  ): Promise<VerifyCredentialsResult> {
    const normalizedEmail = sanitizeEmail(email);
    const normalizedPassword = sanitizeString(password, {
      trim: false,
      maxLength: 256,
    });

    if (!normalizedEmail || !normalizedPassword) {
      return { outcome: "invalid-credentials" };
    }

    if (await isLoginBlocked(normalizedEmail)) {
      await sleep(600);
      logAuthEvent("AUTH_LOGIN_FAILED", { email: normalizedEmail, reason: "blocked" });
      return { outcome: "blocked" };
    }

    const user = await prisma.usuario.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.password || user.activo === false) {
      await recordLoginAttempt(normalizedEmail, false);
      await sleep(600);
      logAuthEvent("AUTH_LOGIN_FAILED", {
        email: normalizedEmail,
        reason: "invalid-credentials",
      });
      return { outcome: "invalid-credentials" };
    }

    const isPasswordCorrect = await comparePassword(
      normalizedPassword,
      user.password,
    );

    if (!isPasswordCorrect) {
      await recordLoginAttempt(normalizedEmail, false);
      await sleep(600);
      logAuthEvent("AUTH_LOGIN_FAILED", {
        email: normalizedEmail,
        reason: "invalid-credentials",
      });
      return { outcome: "invalid-credentials" };
    }

    await recordLoginAttempt(normalizedEmail, true);

    if (!isRol(user.rol)) {
      logAuthEvent("AUTH_LOGIN_FAILED", {
        email: normalizedEmail,
        reason: "invalid-credentials",
      });
      return { outcome: "invalid-credentials" };
    }

    logAuthEvent("AUTH_LOGIN_SUCCESS", { userId: user.id });

    return {
      outcome: "ok",
      user: {
        userId: user.id,
        nombre: user.nombre,
        email: user.email,
        role: user.rol,
        empresaId: user.empresaId ?? null,
        passwordMustChange: user.passwordMustChange ?? false,
      },
    };
  }

  async issueTokenPair(context: AuthContext, device?: DeviceInfo): Promise<TokenPair> {
    const secret = getMobileAuthSecretKey();

    const accessToken = await new SignJWT({
      role: context.role,
      empresaId: context.empresaId,
      passwordMustChange: context.passwordMustChange,
      type: "access",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(context.userId)
      .setIssuedAt()
      .setExpirationTime(ACCESS_TOKEN_TTL)
      .sign(secret);

    const jti = randomUUID();
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + REFRESH_TOKEN_TTL_MS);
    const refreshToken = await signRefreshToken(secret, context.userId, jti, issuedAt, expiresAt);

    await prisma.mobileSession.create({
      data: {
        usuarioId: context.userId,
        refreshTokenHash: hashRefreshToken(refreshToken),
        currentTokenIssuedAt: issuedAt,
        currentTokenJti: jti,
        deviceName: device?.deviceName,
        platform: device?.platform,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  async verifyAccessToken(token: string): Promise<AuthContext> {
    const secret = getMobileAuthSecretKey();
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });

    if (payload.type !== "access" || typeof payload.sub !== "string") {
      throw new Error("Token de acceso inválido");
    }

    if (!isRol(payload.role)) {
      throw new Error("Token de acceso inválido: rol desconocido");
    }

    const empresaId =
      typeof payload.empresaId === "string" || payload.empresaId === null
        ? payload.empresaId
        : null;

    return {
      userId: payload.sub,
      role: payload.role,
      empresaId,
      passwordMustChange: payload.passwordMustChange === true,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresIn: number;
  }> {
    maybeCleanupSessionHistory();

    const secret = getMobileAuthSecretKey();
    const { payload } = await jwtVerify(refreshToken, secret, { algorithms: ["HS256"] });

    if (payload.type !== "refresh" || typeof payload.sub !== "string") {
      throw new Error("Refresh token inválido");
    }

    const userId = payload.sub;

    // El límite se aplica sobre el sub ya verificado criptográficamente por
    // jwtVerify (no un decodificado sin comprobar) para que nadie pueda
    // elegir a voluntad la identidad usada como clave del límite. Se hace
    // antes de tocar la base de datos.
    const rateLimit = await rateLimitService.check(
      `refresh:user:${userId}`,
      REFRESH_RATE_LIMIT_MAX,
      REFRESH_RATE_LIMIT_WINDOW_SECONDS,
    );
    if (!rateLimit.allowed) {
      throw new RateLimitExceededError(
        rateLimit.retryAfterSeconds ?? REFRESH_RATE_LIMIT_WINDOW_SECONDS,
      );
    }

    const presentedHash = hashRefreshToken(refreshToken);
    const now = new Date();

    // Lectura únicamente para obtener el id candidato. Nunca se usa como
    // validación de seguridad: la decisión real de si la rotación gana
    // depende exclusivamente de la condición del updateMany de más abajo.
    const session = await prisma.mobileSession.findUnique({
      where: { refreshTokenHash: presentedHash },
    });

    if (!session || session.usuarioId !== userId) {
      return this.handleStaleRefreshToken(presentedHash, userId, now, secret);
    }

    if (session.revokedAt !== null) {
      throw new Error("Sesión móvil revocada");
    }

    const absoluteDeadline = new Date(session.createdAt.getTime() + MAX_SESSION_LIFETIME_MS);
    if (session.expiresAt <= now || absoluteDeadline <= now) {
      const revoked = await this.revokeSessionById(session.id, "EXPIRED");
      if (revoked) {
        logAuthEvent("AUTH_SESSION_EXPIRED", { userId, sessionId: session.id });
      }
      throw new Error("Sesión móvil expirada");
    }

    const newJti = randomUUID();
    const newRefreshToken = await signRefreshToken(
      secret,
      userId,
      newJti,
      now,
      new Date(now.getTime() + REFRESH_TOKEN_TTL_MS),
    );
    const newHash = hashRefreshToken(newRefreshToken);

    const rotated = await prisma.$transaction(
      async (tx) => {
        const updated = await tx.mobileSession.updateMany({
          where: {
            id: session.id,
            refreshTokenHash: presentedHash,
            revokedAt: null,
            expiresAt: { gt: now },
            createdAt: { gt: new Date(now.getTime() - MAX_SESSION_LIFETIME_MS) },
          },
          data: {
            refreshTokenHash: newHash,
            currentTokenIssuedAt: now,
            currentTokenJti: newJti,
            expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_MS),
          },
        });

        if (updated.count !== 1) {
          return false;
        }

        await tx.mobileSessionTokenHistory.create({
          data: { sessionId: session.id, tokenHash: presentedHash },
        });

        return true;
      },
      { isolationLevel: "ReadCommitted" },
    );

    if (!rotated) {
      // Otra petición concurrente ya rotó o revocó esta sesión entre la
      // lectura y el intento de escritura: no se insertó histórico ni se
      // devuelve el token recién firmado en memoria. Se reevalúa como si
      // el hash presentado ya no fuera el vigente.
      return this.handleStaleRefreshToken(presentedHash, userId, now, secret);
    }

    const user = await prisma.usuario.findUnique({ where: { id: userId } });
    if (!user || user.activo === false || !isRol(user.rol)) {
      throw new Error("Usuario no válido para refrescar el token");
    }

    const accessToken = await signAccessTokenForUser(secret, user);

    logAuthEvent("AUTH_REFRESH_SUCCESS", { userId, sessionId: session.id, reason: "rotated" });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  /**
   * Se llama cuando el hash presentado no es el vigente de ninguna sesión
   * (o dejó de serlo justo antes de una rotación concurrente). Busca en el
   * histórico: dentro de la ventana de gracia responde de forma idempotente
   * reproduciendo el mismo refresh token ya emitido; fuera de la ventana,
   * lo trata como reutilización real y revoca la sesión afectada.
   */
  private async handleStaleRefreshToken(
    hash: string,
    userId: string,
    now: Date,
    secret: Uint8Array,
  ): Promise<{ accessToken: string; refreshToken: string; accessTokenExpiresIn: number }> {
    const historyEntry = await prisma.mobileSessionTokenHistory.findUnique({
      where: { tokenHash: hash },
    });

    if (!historyEntry) {
      throw new Error("Refresh token inválido");
    }

    const session = await prisma.mobileSession.findUnique({
      where: { id: historyEntry.sessionId },
    });

    if (!session || session.usuarioId !== userId) {
      throw new Error("Refresh token inválido");
    }

    const withinGrace =
      now.getTime() - historyEntry.createdAt.getTime() <= REFRESH_TOKEN_GRACE_SECONDS * 1000;

    if (!withinGrace) {
      const revoked = await this.revokeSessionById(session.id, "REUSE_DETECTED");
      if (revoked) {
        logAuthEvent("AUTH_REFRESH_REUSE_DETECTED", { userId, sessionId: session.id });
      }
      throw new Error("Refresh token reutilizado");
    }

    if (
      session.revokedAt !== null ||
      !session.currentTokenIssuedAt ||
      !session.currentTokenJti
    ) {
      // Ya se revocó por otro motivo (p. ej. reutilización detectada por
      // otra petición concurrente), o no hay suficiente información
      // (iat + jti) para reproducir el token vigente de forma idéntica.
      throw new Error("Refresh token inválido");
    }

    const reproducedRefreshToken = await signRefreshToken(
      secret,
      userId,
      session.currentTokenJti,
      session.currentTokenIssuedAt,
      new Date(session.currentTokenIssuedAt.getTime() + REFRESH_TOKEN_TTL_MS),
    );

    const user = await prisma.usuario.findUnique({ where: { id: userId } });
    if (!user || user.activo === false || !isRol(user.rol)) {
      throw new Error("Usuario no válido para refrescar el token");
    }

    const accessToken = await signAccessTokenForUser(secret, user);

    logAuthEvent("AUTH_REFRESH_SUCCESS", { userId, sessionId: session.id, reason: "grace" });

    return {
      accessToken,
      refreshToken: reproducedRefreshToken,
      accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  /**
   * Devuelve true solo si ESTA llamada fue la que revocó la sesión
   * (updateMany.count === 1). false tanto si ya estaba revocada por otra
   * causa (carrera con otra revocación concurrente) como si la escritura
   * falló por error de BD — en ambos casos no hubo revocación efectiva por
   * parte de este llamador, y quien invoque debe poder distinguirlo antes
   * de registrar un evento de éxito.
   */
  private async revokeSessionById(
    sessionId: string,
    reason: "LOGOUT" | "REUSE_DETECTED" | "ADMIN_REVOKE_ALL" | "EXPIRED",
  ): Promise<boolean> {
    const result = await prisma.mobileSession
      .updateMany({
        where: { id: sessionId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: reason },
      })
      .catch((error) => {
        console.error("[AuthService.revokeSessionById]", error);
        return null;
      });

    return result !== null && result.count === 1;
  }

  async revokeSession(refreshToken: string): Promise<void> {
    const hash = hashRefreshToken(refreshToken);

    // Se resuelve primero la sesión (lectura) para poder registrar
    // userId/sessionId en el log. La decisión de revocar sigue siendo
    // idempotente y segura porque revokeSessionById() re-comprueba
    // revokedAt IS NULL en su propia condición de escritura.
    const directSession = await prisma.mobileSession
      .findUnique({ where: { refreshTokenHash: hash } })
      .catch((error) => {
        console.error("[AuthService.revokeSession]", error);
        return null;
      });

    if (directSession) {
      if (directSession.revokedAt === null) {
        const revoked = await this.revokeSessionById(directSession.id, "LOGOUT");
        if (revoked) {
          logAuthEvent("AUTH_LOGOUT", {
            userId: directSession.usuarioId,
            sessionId: directSession.id,
          });
        }
      }
      return;
    }

    // El hash presentado puede pertenecer a un token ya rotado: buscar en
    // el histórico para localizar la sesión y revocarla igualmente.
    const historyEntry = await prisma.mobileSessionTokenHistory
      .findUnique({ where: { tokenHash: hash }, include: { session: true } })
      .catch((error) => {
        console.error("[AuthService.revokeSession]", error);
        return null;
      });

    if (historyEntry) {
      const revoked = await this.revokeSessionById(historyEntry.sessionId, "LOGOUT");
      if (revoked) {
        logAuthEvent("AUTH_LOGOUT", {
          userId: historyEntry.session.usuarioId,
          sessionId: historyEntry.sessionId,
        });
      }
    }
  }

  async revokeAllSessions(userId: string): Promise<number> {
    const result = await prisma.mobileSession
      .updateMany({
        where: { usuarioId: userId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: "ADMIN_REVOKE_ALL" },
      })
      .catch((error) => {
        console.error("[AuthService.revokeAllSessions]", error);
        return null;
      });

    if (result && result.count > 0) {
      logAuthEvent("AUTH_REVOKE_ALL", { userId });
    }

    return result?.count ?? 0;
  }

  async listSessions(userId: string): Promise<MobileSessionSummary[]> {
    const sessions = await prisma.mobileSession.findMany({
      where: { usuarioId: userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        deviceName: true,
        platform: true,
        createdAt: true,
        currentTokenIssuedAt: true,
        expiresAt: true,
      },
    });

    return sessions.map((s) => ({
      id: s.id,
      deviceName: s.deviceName,
      platform: s.platform,
      createdAt: s.createdAt,
      // currentTokenIssuedAt se actualiza en cada rotación de refresh token
      // (ver refreshAccessToken) — es el proxy más fiel a "última vez usada"
      // que existe sin guardar un campo aparte solo para esto.
      lastUsedAt: s.currentTokenIssuedAt,
      expiresAt: s.expiresAt,
    }));
  }

  async revokeSessionForUser(userId: string, sessionId: string): Promise<boolean> {
    // El where incluye usuarioId además de id: esto es lo que impide que
    // alguien revoque la sesión de otra persona simplemente adivinando o
    // enumerando ids de sesión — nunca hay que confiar en que el id
    // "parezca" suyo.
    const result = await prisma.mobileSession
      .updateMany({
        where: { id: sessionId, usuarioId: userId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: "USER_REVOKE_DEVICE" },
      })
      .catch((error) => {
        console.error("[AuthService.revokeSessionForUser]", error);
        return null;
      });

    const revoked = result !== null && result.count === 1;
    if (revoked) {
      logAuthEvent("AUTH_LOGOUT", { userId, sessionId, reason: "user_revoke_device" });
    }
    return revoked;
  }
}
