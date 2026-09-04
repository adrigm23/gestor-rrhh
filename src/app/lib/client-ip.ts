// Auditoría de seguridad (Fase 2.19): extraído de
// api/mobile/v1/auth/login/route.ts para reutilizarlo también en el login
// web (api/auth/auth.ts, hallazgo #9) sin duplicar la lógica.
//
// El primer valor de X-Forwarded-For lo escribe el CLIENTE, no el proxy —
// cualquiera puede falsificarlo y saltarse un límite por IP mandando un
// valor distinto en cada petición. x-real-ip la fija la plataforma (Vercel)
// y no es manipulable por el cliente; si no existe, el último valor de XFF
// es el que añadió el proxy más cercano al servidor, no el que mandó quien
// hizo la petición.
export const getClientIp = (headers: Headers): string => {
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
    return parts[parts.length - 1] || "unknown";
  }
  return "unknown";
};
