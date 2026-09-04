const BEARER_PREFIX = "Bearer ";

/** Extrae el refresh token del header Authorization ("Bearer <token>"). */
export function requireRefreshToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header || !header.startsWith(BEARER_PREFIX)) {
    return null;
  }

  const token = header.slice(BEARER_PREFIX.length).trim();
  return token || null;
}
