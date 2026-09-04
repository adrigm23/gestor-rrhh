import { authService } from "../../../../../services/auth";
import type { AuthContext } from "../../../../../services/auth";

const BEARER_PREFIX = "Bearer ";

export type RequireAuthResult =
  | { ok: true; context: AuthContext }
  | { ok: false; reason: "unauthorized" }
  | { ok: false; reason: "password_must_change" };

export async function requireAuth(request: Request): Promise<RequireAuthResult> {
  const header = request.headers.get("authorization");
  if (!header || !header.startsWith(BEARER_PREFIX)) {
    return { ok: false, reason: "unauthorized" };
  }

  const token = header.slice(BEARER_PREFIX.length).trim();
  if (!token) {
    return { ok: false, reason: "unauthorized" };
  }

  try {
    const context = await authService.verifyAccessToken(token);
    if (context.passwordMustChange) {
      return { ok: false, reason: "password_must_change" };
    }
    return { ok: true, context };
  } catch {
    return { ok: false, reason: "unauthorized" };
  }
}
