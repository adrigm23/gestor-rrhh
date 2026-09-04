import type { NextConfig } from "next";

// Auditoría de seguridad (Fase 2.19, hallazgo #15): si NEXT_ALLOWED_ORIGINS
// no está definida, antes esto devolvía un array vacío — es decir, sin
// defensa en profundidad extra frente al CSRF-bypass de Server Actions,
// dependiendo solo del parche de Next. Como fallback (nunca sustituye a
// configurar NEXT_ALLOWED_ORIGINS explícitamente en prod) se deriva el host
// de APP_URL, que ya es obligatoria para los enlaces de reset de contraseña.
const deriveOriginFromAppUrl = (): string | null => {
  const raw = process.env.APP_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).host;
  } catch {
    return null;
  }
};

const parseAllowedOrigins = () => {
  const raw = process.env.NEXT_ALLOWED_ORIGINS ?? "";
  const explicit = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (explicit.length > 0) return explicit;

  const fallback = deriveOriginFromAppUrl();
  return fallback ? [fallback] : [];
};

// Auditoría de seguridad (Fase 2.19, hallazgo #14): el dashboard no llevaba
// ninguna cabecera de seguridad — era embebible en un iframe de terceros
// (clickjacking) y sin las protecciones estándar mínimas. CSP no se incluye
// aquí: Next.js usa scripts/estilos inline en el arranque y una CSP estricta
// sin nonces/hashes correctamente calculados rompería la app; queda como
// trabajo aparte, no como fix rápido.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // geolocation=(self): el fichaje con geolocalización (fichaje-geo-form.tsx)
  // pide navigator.geolocation desde el propio origen; el resto se deniega.
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=()" },
];

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  transpilePackages: ["@gestor-rrhh/shared"],
  experimental: {
    serverActions: {
      allowedOrigins: parseAllowedOrigins(),
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
