/**
 * Añade opacidad a un color hex (#rrggbb) devolviendo un rgba(...) — usado
 * por IconTile para el fondo "tintado" del rediseño soft-UI (Fase 2.18).
 * Si el valor ya no es un hex de 6 dígitos (p. ej. un rgba(...) de
 * cardBorder en modo oscuro), se devuelve tal cual sin tocar.
 */
export function withOpacity(hex: string, alpha: number): string {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!match) return hex;
  const int = parseInt(match[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
